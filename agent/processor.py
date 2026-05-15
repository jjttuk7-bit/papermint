import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Optional, TypedDict

import anthropic
import openai
import yaml

logger = logging.getLogger("hf_papers_agent")

_PROMPTS_DIR = Path(__file__).parent / "prompts"
_CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"


# ── 타입 정의 ────────────────────────────────────────────────────────────────

class ProcessedPaper(TypedDict):
    categories: list[str]
    one_liner_en: str
    one_liner_ko: Optional[str]
    contributions_en: list[str]
    contributions_ko: Optional[list[str]]
    title_ko: Optional[str]
    abstract_ko: Optional[str]
    ai_summary_ko: Optional[str]


# ── 설정 / 프롬프트 로드 ─────────────────────────────────────────────────────

def load_config() -> dict:
    with open(_CONFIG_PATH, encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_prompt(version: str) -> tuple[str, str]:
    """(system_prompt, user_template) 반환. 아카이브 폴백 포함."""
    path = _PROMPTS_DIR / f"{version}_unified.txt"
    if not path.exists():
        path = _PROMPTS_DIR / "archive" / f"{version}_unified.txt"
    text = path.read_text(encoding="utf-8")

    parts = re.split(r"^\[USER\]", text, maxsplit=1, flags=re.MULTILINE)
    if len(parts) != 2:
        raise ValueError(f"프롬프트 파일 형식 오류: [USER] 구분자 없음 ({path})")

    system = re.sub(r"^\[SYSTEM\]\n?", "", parts[0], flags=re.MULTILINE).strip()
    user_template = parts[1].strip()
    return system, user_template


def _build_user_prompt(template: str, paper: dict, config: dict) -> str:
    categories_str = ", ".join(config["categories"])
    return (
        template
        .replace("{title_en}", paper.get("title_en", ""))
        .replace("{abstract_en}", paper.get("abstract_en", "") or "")
        .replace("{ai_summary_en}", paper.get("ai_summary_en", "") or "")
        .replace("{categories_from_config}", categories_str)
    )


# ── JSON 안전 파싱 ────────────────────────────────────────────────────────────

def safe_parse_json(text: str) -> dict:
    """LLM 응답에서 JSON을 3단계로 안전하게 추출한다."""
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    code_block = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if code_block:
        try:
            return json.loads(code_block.group(1))
        except json.JSONDecodeError:
            pass

    brace_match = re.search(r"\{[\s\S]*\}", text)
    if brace_match:
        try:
            return json.loads(brace_match.group())
        except json.JSONDecodeError:
            pass

    logger.error(f"JSON 파싱 실패. 원본 앞 200자: {text[:200]}")
    raise ValueError("JSON 파싱 실패: 유효한 JSON을 찾을 수 없습니다.")


# ── LLM 호출 ─────────────────────────────────────────────────────────────────

def _call_with_backoff(fn, max_retries: int = 3):
    """LLM rate limit(429) 대상 지수 백오프 재시도."""
    delay = 1
    last_exc: Exception = RuntimeError("no attempts made")
    for attempt in range(max_retries):
        try:
            return fn()
        except Exception as e:
            last_exc = e
            err_str = str(e).lower()
            if "rate" in err_str or "429" in err_str or "limit" in err_str:
                logger.warning(f"LLM Rate Limit — {delay}초 대기 (시도 {attempt + 1}/{max_retries})")
                time.sleep(delay)
                delay *= 2
            else:
                raise
    raise last_exc


def call_openai(system_prompt: str, user_prompt: str, config: dict) -> str:
    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    model = config["llm"]["primary_model"]
    max_tokens = config["llm"]["max_tokens"]
    temperature = config["llm"]["temperature"]

    def _call():
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.choices[0].message.content

    return _call_with_backoff(_call)


def call_anthropic(system_prompt: str, user_prompt: str, config: dict) -> str:
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    model = config["llm"]["fallback_model"]
    max_tokens = config["llm"]["max_tokens"]

    def _call():
        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return response.content[0].text

    return _call_with_backoff(_call)


# ── 출력 검증 ─────────────────────────────────────────────────────────────────

def _validate(result: dict, allowed_categories: list[str]) -> dict:
    """카테고리 범위 이탈 필터링. 나머지 필드는 그대로 통과."""
    raw_cats = result.get("categories") or []
    valid_cats = [c for c in raw_cats if c in allowed_categories]
    if not valid_cats:
        valid_cats = ["Survey"]
    if len(valid_cats) != len(raw_cats):
        invalid = set(raw_cats) - set(allowed_categories)
        logger.warning(f"categories 범위 이탈 필터링: {invalid}")
    result["categories"] = valid_cats
    return result


# ── 공개 인터페이스 ───────────────────────────────────────────────────────────

def process_with_fallback(paper: dict, config: Optional[dict] = None) -> ProcessedPaper:
    """GPT-4o → Claude → 영문 fallback 순서로 처리."""
    if config is None:
        config = load_config()

    version = config.get("prompt_version", "v1.0")
    system_prompt, user_template = load_prompt(version)
    user_prompt = _build_user_prompt(user_template, paper, config)
    allowed = config["categories"]

    # 1차: GPT-4o
    try:
        raw = call_openai(system_prompt, user_prompt, config)
        result = safe_parse_json(raw)
        return _validate(result, allowed)
    except Exception as e:
        logger.warning(f"GPT-4o 실패: {e}. Claude 백업 시도...")

    # 2차: Claude
    try:
        raw = call_anthropic(system_prompt, user_prompt, config)
        result = safe_parse_json(raw)
        return _validate(result, allowed)
    except Exception as e:
        logger.error(f"Claude 백업도 실패: {e}. 영문 fallback 적용.")

    # 3차: 영문 fallback
    return ProcessedPaper(
        categories=["Survey"],
        one_liner_en=paper.get("abstract_en", "")[:200],
        one_liner_ko=None,
        contributions_en=[],
        contributions_ko=None,
        title_ko=None,
        abstract_ko=None,
        ai_summary_ko=None,
    )


def process(paper: dict) -> ProcessedPaper:
    """단일 논문 처리 공개 인터페이스."""
    return process_with_fallback(paper)
