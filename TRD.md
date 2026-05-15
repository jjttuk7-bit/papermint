# TRD.md (Technical Requirements Document)

## 1. 시스템 아키텍처

### 1.1 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              클라이언트 (브라우저)                            │
│                         Next.js 정적 사이트 (GitHub Pages)                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GitHub Actions                                  │
│                                                                              │
│  ┌─────────────┐    ┌──────────────────────────┐    ┌─────────────┐        │
│  │   Fetcher   │───▶│       Processor           │───▶│  Publisher  │        │
│  │ (asyncio)   │    │  (분석 + 번역 LLM 1회)    │    │  + Notifier │        │
│  └─────────────┘    └──────────────────────────┘    └─────────────┘        │
│        │                         │                         │                 │
│        │              ┌─────────────────┐                  │                 │
│        └─────────────▶│     SQLite      │◀─────────────────┘                 │
│                       │  data/hf_papers │                                    │
│                       │    .db (Git)    │                                    │
│                       └─────────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 배포 아키텍처

```
GitHub Repository
├── main 브랜치 (소스 코드 + DB 파일)
│   └── push → GitHub Actions (에이전트 실행)
│         └── data/hf_papers.db 커밋 포함 (MVP 지속성 전략)
│
├── gh-pages 브랜치 (빌드 결과물)
│   └── GitHub Pages 자동 배포
│
└── 데이터 흐름:
    1. 에이전트 실행 → DB 업데이트 + Markdown 생성
    2. Git commit & push (DB 파일 포함)
    3. GitHub Actions (빌드 워크플로우) → Next.js 빌드
    4. gh-pages 브랜치에 빌드 결과물 푸시
    5. GitHub Pages에서 정적 사이트 서빙
```

> **SQLite DB 지속성 전략 (MVP)**
> GitHub Actions는 실행마다 클린 환경에서 시작한다. 누적 데이터를 유지하려면
> `data/hf_papers.db`를 Git 커밋 대상에 포함해야 한다.
> 향후 v1.1에서 GitHub Actions Cache로 전환하여 Git 히스토리 오염을 방지한다.

---

## 2. 기술 스택 상세

### 2.1 에이전트 (Python)

| 목적 | 라이브러리 | 버전 | 이유 |
|---|---|---|---|
| HTTP 요청 (비동기) | `httpx` | ^0.27 | asyncio 지원, Fetcher 병렬화용 |
| HTTP 요청 (동기 폴백) | `requests` | ^2.31 | 단순 동기 호출 폴백 |
| LLM (OpenAI) | `openai` | ^1.0 | GPT-4o API 공식 클라이언트 |
| LLM (Anthropic) | `anthropic` | ^0.25 | Claude 3.5 Sonnet 백업용 |
| ORM | `sqlalchemy` | ^2.0 | DB 추상화, 마이그레이션 지원 |
| DB 마이그레이션 | `alembic` | ^1.13 | 스키마 변경 이력 관리 |
| 설정 | `pyyaml` | ^6.0 | YAML 설정 파일 파싱 |
| 환경변수 | `python-dotenv` | ^1.0 | 로컬 개발 시 .env 파일 사용 |
| 날짜/시간 | `python-dateutil` | ^2.9 | 날짜 파싱/포맷팅 |

### 2.2 웹사이트 (Next.js)

| 목적 | 패키지 | 버전 | 이유 |
|---|---|---|---|
| 프레임워크 | `next` | ^14 | App Router, ISR, SSG 지원 |
| 언어 | `typescript` | ^5 | 타입 안정성 |
| 스타일링 | `tailwindcss` | ^3 | 유틸리티 우선 CSS |
| UI 컴포넌트 | `@radix-ui/*` | 최신 | shadcn/ui 기반 |
| 마크다운 | `react-markdown` | ^9 | 서버 사이드 마크다운 렌더링 |
| 코드 하이라이트 | `prismjs` | ^1 | 코드 블록 하이라이팅 |
| DB (서버) | `better-sqlite3` | ^9 | 동기 SQLite, 서버 컴포넌트용 |
| 날짜 포맷 | `date-fns` | ^3 | 가벼운 날짜 유틸리티 |

### 2.3 인프라

| 구성 요소 | 서비스 | 비용 |
|---|---|---|
| 소스 코드 호스팅 | GitHub | 무료 (Public Repo) |
| CI/CD | GitHub Actions | 무료 (월 2,000분) |
| 정적 사이트 호스팅 | GitHub Pages | 무료 |
| 이메일 발송 | Buttondown | 무료 (1,000명까지) |
| LLM API | OpenAI / Anthropic | 사용량 기준 (~$0.15~0.20/일, 통합 프롬프트 기준) |

---

## 3. 데이터베이스 설계

### 3.1 ERD

```
┌─────────────────┐         ┌─────────────────┐
│     papers      │◄────────│   daily_papers  │
├─────────────────┤    1:N  ├─────────────────┤
│ id (PK)         │         │ id (PK)         │
│ arxiv_id (UQ)   │         │ date            │
│ title_en        │         │ paper_id (FK)   │
│ title_ko        │         │ rank            │
│ abstract_en     │         │ importance      │
│ abstract_ko     │         └─────────────────┘
│ ai_summary_en   │
│ ai_summary_ko   │         ┌─────────────────┐
│ contributions_en│         │  execution_logs │
│ contributions_ko│         ├─────────────────┤
│ one_liner_en    │         │ id (PK)         │
│ one_liner_ko    │         │ job_id          │
│ authors (JSON)  │         │ started_at      │
│ categories(JSON)│         │ ended_at        │
│ upvotes         │         │ status          │
│ github_repo     │         │ papers_count    │
│ project_page    │         │ api_cost (REAL) │ ← Float 타입
│ linked_models   │         │ prompt_version  │
│ published_at    │         │ error_msg       │
│ fetched_at      │         └─────────────────┘
│ processed_at    │ ← translated_at 대체
│ published       │
│ prompt_version  │ ← 신규 추가
└─────────────────┘
```

### 3.2 스키마 정의 (SQL)

```sql
-- papers 테이블
CREATE TABLE papers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    arxiv_id TEXT UNIQUE NOT NULL,
    title_en TEXT NOT NULL,
    title_ko TEXT,
    abstract_en TEXT,
    abstract_ko TEXT,
    ai_summary_en TEXT,
    ai_summary_ko TEXT,
    contributions_en TEXT,  -- JSON array (json.dumps 직렬화)
    contributions_ko TEXT,  -- JSON array (json.dumps 직렬화)
    one_liner_en TEXT,
    one_liner_ko TEXT,
    authors TEXT,           -- JSON array (json.dumps 직렬화)
    categories TEXT,        -- JSON array (json.dumps 직렬화)
    upvotes INTEGER DEFAULT 0,
    github_repo TEXT,
    project_page TEXT,
    linked_models TEXT,     -- JSON array (json.dumps 직렬화)
    published_at DATETIME,
    fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,  -- 분석+번역 완료 시각 (구 translated_at)
    published BOOLEAN DEFAULT FALSE,
    prompt_version TEXT     -- 처리에 사용된 프롬프트 버전 (ex: "v1.0")
);

CREATE INDEX idx_papers_arxiv ON papers(arxiv_id);
CREATE INDEX idx_papers_published ON papers(published);
CREATE INDEX idx_papers_fetched ON papers(fetched_at);
CREATE INDEX idx_papers_processed ON papers(processed_at);

-- daily_papers 테이블
CREATE TABLE daily_papers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    paper_id INTEGER NOT NULL REFERENCES papers(id),
    rank INTEGER,
    importance TEXT CHECK(importance IN ('hot', 'normal')),
    UNIQUE(date, paper_id)
);

CREATE INDEX idx_daily_date ON daily_papers(date);

-- execution_logs 테이블
CREATE TABLE execution_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    started_at DATETIME,
    ended_at DATETIME,
    status TEXT CHECK(status IN ('success', 'failed', 'partial')),
    papers_count INTEGER,
    api_cost REAL,          -- ← REAL 타입 (소수점 비용 저장)
    prompt_version TEXT,    -- 신규: 사용된 프롬프트 버전
    error_msg TEXT
);

CREATE INDEX idx_logs_job ON execution_logs(job_id);
CREATE INDEX idx_logs_date ON execution_logs(started_at);
```

### 3.3 ORM 모델 (SQLAlchemy)

```python
import json
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey, CheckConstraint
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.types import TypeDecorator
from datetime import datetime

Base = declarative_base()


# ── JSON 자동 직렬화/역직렬화 TypeDecorator ──────────────────────────────────
class JsonType(TypeDecorator):
    """SQLite TEXT 컬럼에 Python list/dict를 자동으로 JSON 직렬화/역직렬화한다."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        """Python → DB: list/dict를 JSON 문자열로 직렬화"""
        if value is not None:
            return json.dumps(value, ensure_ascii=False)
        return value

    def process_result_value(self, value, dialect):
        """DB → Python: JSON 문자열을 list/dict로 역직렬화"""
        if value is not None:
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value  # 파싱 실패 시 원문 반환 (안전 처리)
        return value


# ── ORM 모델 ─────────────────────────────────────────────────────────────────
class Paper(Base):
    __tablename__ = 'papers'

    id = Column(Integer, primary_key=True)
    arxiv_id = Column(String, unique=True, nullable=False)
    title_en = Column(Text, nullable=False)
    title_ko = Column(Text)
    abstract_en = Column(Text)
    abstract_ko = Column(Text)
    ai_summary_en = Column(Text)
    ai_summary_ko = Column(Text)
    contributions_en = Column(JsonType)  # list[str] 자동 직렬화
    contributions_ko = Column(JsonType)  # list[str] 자동 직렬화
    one_liner_en = Column(Text)
    one_liner_ko = Column(Text)
    authors = Column(JsonType)           # list[str] 자동 직렬화
    categories = Column(JsonType)        # list[str] 자동 직렬화
    upvotes = Column(Integer, default=0)
    github_repo = Column(String)
    project_page = Column(String)
    linked_models = Column(JsonType)     # list[str] 자동 직렬화
    published_at = Column(DateTime)
    fetched_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)      # 구 translated_at
    published = Column(Boolean, default=False)
    prompt_version = Column(String)      # 신규

    daily_entries = relationship("DailyPaper", back_populates="paper")


class DailyPaper(Base):
    __tablename__ = 'daily_papers'

    id = Column(Integer, primary_key=True)
    date = Column(String, nullable=False)  # YYYY-MM-DD
    paper_id = Column(Integer, ForeignKey('papers.id'), nullable=False)
    rank = Column(Integer)
    importance = Column(String)

    paper = relationship("Paper", back_populates="daily_entries")

    __table_args__ = (
        CheckConstraint("importance IN ('hot', 'normal')"),
    )


class ExecutionLog(Base):
    __tablename__ = 'execution_logs'

    id = Column(Integer, primary_key=True)
    job_id = Column(String, nullable=False)
    started_at = Column(DateTime)
    ended_at = Column(DateTime)
    status = Column(String)
    papers_count = Column(Integer)
    api_cost = Column(Float)        # ← Float 타입 (구 Integer 오타 수정)
    prompt_version = Column(String) # 신규
    error_msg = Column(Text)

    __table_args__ = (
        CheckConstraint("status IN ('success', 'failed', 'partial')"),
    )
```

---

## 4. API 명세

### 4.1 외부 API (수집용)

#### HF Papers API

| 메서드 | 엔드포인트 | 파라미터 | 응답 | 인증 |
|---|---|---|---|---|
| GET | `https://huggingface.co/api/daily_papers` | `date` (YYYY-MM-DD) | JSON 배열 | 불필요 (HF_TOKEN 권장) |
| GET | `https://huggingface.co/api/papers/{arxiv_id}` | - | JSON 객체 | 불필요 |
| GET | `https://huggingface.co/api/papers/search` | `q` | JSON 배열 | 불필요 |

**응답 예시 (daily_papers)**:
```json
[
  {
    "paper": {
      "id": "2505.12345",
      "title": "Qwen3-235B-A22B: The Next Generation of MoE Reasoning Models",
      "authors": [{"name": "Qwen Team"}],
      "summary": "We present Qwen3-235B-A22B...",
      "upvotes": 342,
      "publishedAt": "2026-05-14T00:00:00Z"
    },
    "publishedAt": "2026-05-15T00:00:00Z"
  }
]
```

#### OpenAI API

| 메서드 | 엔드포인트 | 모델 | 비용 |
|---|---|---|---|
| POST | `https://api.openai.com/v1/chat/completions` | `gpt-4o` | Input $2.5/M, Output $10/M |

#### Anthropic API (백업)

| 메서드 | 엔드포인트 | 모델 | 비용 |
|---|---|---|---|
| POST | `https://api.anthropic.com/v1/messages` | `claude-3-5-sonnet-20241022` | Input $3/M, Output $15/M |

### 4.2 내부 API (웹사이트)

| 메서드 | 엔드포인트 | 설명 | 응답 |
|---|---|---|---|
| GET | `/api/papers?date=YYYY-MM-DD` | 날짜별 논문 목록 | JSON 배열 |
| GET | `/api/papers/[id]` | 특정 논문 상세 | JSON 객체 |
| GET | `/api/feed.xml` | RSS 피드 | XML |

---

## 5. LLM 프롬프트 설계

> **관리 원칙**: 프롬프트 전체 내용 및 버전 이력은 `PROMPTS.md`에서 관리한다.
> 여기서는 구조와 입출력 명세만 정의한다.

### 5.1 통합 프로세서 프롬프트 (v1_unified)

**설계 목표**: 분석(분류, 기여 추출, 한 줄 요약)과 번역을 단일 LLM 호출로 처리.

**입력**:
```
title: {title_en}
abstract: {abstract_en}
ai_summary: {ai_summary_en}
available_categories: {categories_from_config}  ← config.yaml에서 동적 주입
```

**출력 (JSON)**:
```json
{
  "categories": ["NLP", "LLM"],
  "one_liner_en": "This paper proposes ...",
  "one_liner_ko": "이 논문은 ... 을 제안합니다.",
  "contributions_en": ["contribution 1", "contribution 2", "contribution 3"],
  "contributions_ko": ["기여 1", "기여 2", "기여 3"],
  "title_ko": "한글 제목",
  "abstract_ko": "한글 초록...",
  "ai_summary_ko": "한글 AI 요약..."
}
```

**번역 규칙** (프롬프트 내 명시):
1. 학술 용어는 첫 등장 시 원문을 병기: "어텐션 메커니즘 (Attention mechanism)"
2. 고유명사/알고리즘명은 원문 유지: "LoRA", "RLHF", "Transformer", "GPT-4"
3. 수식은 LaTeX 형태 유지: `$E = mc^2$`
4. 자연스러운 한국어 문장, 전문가 수준 정확성
5. '~습니다' 체 사용

### 5.2 카테고리 동적 주입

```python
# config.yaml에서 카테고리 읽어 프롬프트에 주입
import yaml

with open("config.yaml") as f:
    config = yaml.safe_load(f)

categories_str = ", ".join(config["categories"])
prompt = prompt_template.replace("{categories_from_config}", categories_str)
```

---

## 6. JSON 안전 파싱 로직

> LLM은 JSON 앞뒤에 설명 텍스트를 붙이거나 형식을 어기는 경우가 있다.
> 모든 LLM JSON 파싱은 아래 `safe_parse_json` 함수를 통해 처리한다.

```python
import re
import json
import logging

logger = logging.getLogger("hf_papers_agent")

def safe_parse_json(text: str) -> dict:
    """
    LLM 응답 텍스트에서 JSON을 안전하게 추출한다.
    
    시도 순서:
    1. 전체 텍스트 직접 파싱
    2. ```json ... ``` 블록 추출
    3. 첫 번째 { ... } 블록 추출
    """
    # 시도 1: 직접 파싱
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # 시도 2: ```json 코드 블록 추출
    code_block = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if code_block:
        try:
            return json.loads(code_block.group(1))
        except json.JSONDecodeError:
            pass

    # 시도 3: 첫 번째 { ... } 블록 추출 (중첩 포함)
    brace_match = re.search(r'\{[\s\S]*\}', text)
    if brace_match:
        try:
            return json.loads(brace_match.group())
        except json.JSONDecodeError:
            pass

    # 모두 실패
    logger.error(f"JSON 파싱 실패. 원본 텍스트 앞 200자: {text[:200]}")
    raise ValueError(f"JSON 파싱 실패: 유효한 JSON을 찾을 수 없습니다.")


def process_with_fallback(paper: dict, config: dict) -> dict:
    """
    메인 LLM → 백업 LLM → 영문 fallback 순서로 처리.
    """
    # 1차: GPT-4o
    try:
        raw = call_openai(paper, config)
        return safe_parse_json(raw)
    except Exception as e:
        logger.warning(f"GPT-4o 실패: {e}. Claude 백업 시도...")

    # 2차: Claude 백업
    try:
        raw = call_anthropic(paper, config)
        return safe_parse_json(raw)
    except Exception as e:
        logger.error(f"Claude 백업도 실패: {e}. 영문 fallback 적용.")

    # 3차: 영문 fallback (번역 없이 원문 사용)
    return {
        "categories": ["Survey"],
        "one_liner_en": paper.get("summary", "")[:200],
        "one_liner_ko": None,
        "contributions_en": [],
        "contributions_ko": None,
        "title_ko": None,
        "abstract_ko": None,
        "ai_summary_ko": None,
    }
```

---

## 7. 비동기 Fetcher 설계

```python
import asyncio
import httpx
from typing import List

MAX_CONCURRENT = 3  # HF API Rate Limit 고려

async def fetch_paper_detail(client: httpx.AsyncClient, arxiv_id: str) -> dict:
    url = f"https://huggingface.co/api/papers/{arxiv_id}"
    headers = {}
    if HF_TOKEN := os.getenv("HF_TOKEN"):
        headers["Authorization"] = f"Bearer {HF_TOKEN}"
    
    response = await client.get(url, headers=headers, timeout=10.0)
    response.raise_for_status()
    return response.json()


async def fetch_all_details(arxiv_ids: List[str]) -> List[dict]:
    """Semaphore로 동시 요청 수를 제한하며 병렬 수집."""
    semaphore = asyncio.Semaphore(MAX_CONCURRENT)

    async def fetch_with_semaphore(client, arxiv_id):
        async with semaphore:
            try:
                return await fetch_paper_detail(client, arxiv_id)
            except Exception as e:
                logger.error(f"[{arxiv_id}] 상세 정보 수집 실패: {e}")
                return None

    async with httpx.AsyncClient() as client:
        tasks = [fetch_with_semaphore(client, aid) for aid in arxiv_ids]
        results = await asyncio.gather(*tasks)

    return [r for r in results if r is not None]


# 실행 진입점
def fetch_papers(date: str) -> List[dict]:
    return asyncio.run(fetch_all_details(get_arxiv_ids(date)))
```

---

## 8. 에러 처리 & 재시도 전략

### 8.1 재시도 정책

| 시나리오 | 재시도 횟수 | 대기 시간 | 폴백 |
|---|---|---|---|
| HF API 429 (Rate Limit) | 3회 | Retry-After 헤더 값 | 다음 실행까지 스킵 |
| HF API 5xx | 3회 | 2^attempt 초 (1, 2, 4) | 다음 실행까지 스킵 |
| LLM API 429 | 3회 | 2^attempt 초 | 백업 LLM 사용 |
| LLM JSON 파싱 실패 | 1회 (백업 LLM) | 즉시 | 영문 fallback |
| LLM API 5xx | 3회 | 2^attempt 초 | 영문 fallback |
| DB 잠금 | 3회 | 1초 | 에러 로그 기록, 종료 |

### 8.2 에러 로깅

```python
import logging
import traceback
from datetime import datetime

logger = logging.getLogger("hf_papers_agent")

def log_error(error: Exception, context: str, execution_log):
    logger.error(f"[{context}] {str(error)}")
    logger.debug(traceback.format_exc())

    # API 키 마스킹
    error_msg = str(error)
    import re
    error_msg = re.sub(r'sk-[A-Za-z0-9]{10,}', 'sk-***MASKED***', error_msg)

    execution_log.error_msg = f"[{context}] {error_msg}"
    execution_log.status = "partial"  # 일부 성공한 경우
```

---

## 9. 보안 요구사항

### 9.1 API 키 관리

| 항목 | 저장 위치 | 접근 방식 |
|---|---|---|
| `OPENAI_API_KEY` | GitHub Secrets | `os.getenv("OPENAI_API_KEY")` |
| `ANTHROPIC_API_KEY` | GitHub Secrets | `os.getenv("ANTHROPIC_API_KEY")` |
| `HF_TOKEN` | GitHub Secrets (선택 권장) | `os.getenv("HF_TOKEN")` |
| `DISCORD_WEBHOOK` | GitHub Secrets | `os.getenv("DISCORD_WEBHOOK")` |
| `BUTTONDOWN_API_KEY` | GitHub Secrets | `os.getenv("BUTTONDOWN_API_KEY")` |
| `SLACK_WEBHOOK` | GitHub Secrets | `os.getenv("SLACK_WEBHOOK")` |

### 9.2 데이터 보안

- `data/hf_papers.db`는 논문 데이터만 포함하므로 Git 커밋 허용
- `.env` 파일은 `.gitignore`에 반드시 포함
- 로그에 API 키 마스킹: `sk-***MASKED***`
- 이메일 주소는 Buttondown에서 관리 (로컬 저장 안 함)

---

## 10. 성능 요구사항

### 10.1 파이프라인 성능

| 단계 | 목표 시간 | 병렬화 |
|---|---|---|
| Fetcher (목록) | < 2초 | - |
| Fetcher (상세 x12) | < 5초 | asyncio Semaphore(3) 병렬 처리 |
| Processor (x12, 통합) | < 60초 | 순차 (LLM API Rate Limit) |
| Publisher + Notifier | < 5초 | - |
| **총계** | **< 90초** | asyncio 적용 시 |

### 10.2 웹사이트 성능

| 지표 | 목표 | 측정 도구 |
|---|---|---|
| TTFB (Time to First Byte) | < 200ms | Chrome DevTools |
| LCP (Largest Contentful Paint) | < 2.5s | Lighthouse |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse |
| FID (First Input Delay) | < 100ms | Lighthouse |

---

## 11. 배포 파이프라인

### 11.1 GitHub Actions 워크플로우

```yaml
# .github/workflows/daily-papers.yml
name: Daily Papers Fetch & Publish

on:
  schedule:
    - cron: '0 0 * * *'  # UTC 00:00 = KST 09:00
  workflow_dispatch:       # 수동 트리거 (AD-001)

jobs:
  agent:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1   # 최신 커밋만 체크아웃 (속도 최적화)

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'     # pip 캐시로 설치 속도 향상

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run Agent
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          HF_TOKEN: ${{ secrets.HF_TOKEN }}
          DISCORD_WEBHOOK: ${{ secrets.DISCORD_WEBHOOK }}
          BUTTONDOWN_API_KEY: ${{ secrets.BUTTONDOWN_API_KEY }}
          SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
        run: python agent/main.py

      - name: Commit changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/hf_papers.db website/content/
          git diff --staged --quiet || git commit -m "daily: $(date +%Y-%m-%d) papers update"
          git push

  build:
    needs: agent
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: website/package-lock.json

      - name: Install dependencies
        run: |
          cd website
          npm ci  # npm install 대신 ci 사용 (재현성 보장)

      - name: Build
        run: |
          cd website
          npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./website/out
          cname: ""  # 커스텀 도메인 사용 시 입력
```

### 11.2 환경별 설정

| 환경 | 설정 파일 | DB | LLM 모델 |
|---|---|---|---|
| 로컬 개발 | `.env` | SQLite (로컬 파일) | GPT-4o (소량 테스트) |
| GitHub Actions | GitHub Secrets | SQLite (Git 커밋) | GPT-4o |

---

## 12. 모니터링 & 로깅

### 12.1 로그 구조

```
logs/
└── agent/
    ├── {YYYY-MM-DD}.log   # 날짜별 통합 로그 (fetcher + processor + publisher)
    └── errors.log         # 에러 전용 로그 (누적)
```

> GitHub Pages는 서버 접근 로그를 제공하지 않는다. 웹사이트 방문 통계는
> Google Analytics (GA4)를 Next.js에 삽입하여 수집한다.

### 12.2 알림 규칙

| 조건 | 알림 채널 | 메시지 예시 |
|---|---|---|
| 파이프라인 성공 | Discord | `✅ 2026-05-15: 12편 처리 완료 ($0.14)` |
| 파이프라인 부분 실패 | Discord | `⚠️ 2026-05-15: 10/12편 성공, 2편 영문 fallback` |
| 파이프라인 전체 실패 | Discord + 이메일 | `❌ 2026-05-15: 실행 실패 - {에러 요약}` |
| LLM 비용 초과 | 이메일 | `💰 일일 API 비용 $0.50 초과 (실제: $X.XX)` |
| JSON 파싱 실패 다수 | Discord | `🔧 JSON 파싱 실패 3건 이상 — 프롬프트 점검 필요` |

---

## 13. 테스트 전략

### 13.1 테스트 유형

| 유형 | 도구 | 범위 |
|---|---|---|
| 단위 테스트 | `pytest` | fetcher, processor, publisher 개별 함수 |
| 통합 테스트 | `pytest` | 전체 파이프라인 (Mock API 사용) |
| JSON 파싱 테스트 | `pytest` | safe_parse_json 엣지 케이스 |
| E2E 테스트 | `Playwright` | 웹사이트 주요 사용자 흐름 |

### 13.2 테스트 시나리오

```python
# Fetcher 단위 테스트
def test_fetch_daily_papers():
    papers = fetcher.fetch_daily_papers("2026-05-15")
    assert len(papers) > 0
    assert all("arxiv_id" in p for p in papers)

# Processor 단위 테스트
def test_process_paper():
    result = processor.process({
        "title_en": "Attention Is All You Need",
        "abstract_en": "We propose a new simple network architecture...",
        "ai_summary_en": "This paper introduces the Transformer..."
    })
    assert result["title_ko"] is not None
    assert isinstance(result["categories"], list)
    assert isinstance(result["contributions_ko"], list)
    assert len(result["contributions_ko"]) >= 3

# JSON 안전 파싱 테스트
def test_safe_parse_json_with_preamble():
    text = "물론입니다! 분석 결과는 다음과 같습니다:\n```json\n{\"key\": \"value\"}\n```"
    result = safe_parse_json(text)
    assert result == {"key": "value"}

def test_safe_parse_json_plain():
    text = '{"categories": ["NLP"], "one_liner_ko": "테스트"}'
    result = safe_parse_json(text)
    assert result["categories"] == ["NLP"]

# JsonType ORM 테스트
def test_json_type_roundtrip(db_session):
    paper = Paper(arxiv_id="test-001", title_en="Test", categories=["NLP", "LLM"])
    db_session.add(paper)
    db_session.commit()
    retrieved = db_session.query(Paper).filter_by(arxiv_id="test-001").first()
    assert retrieved.categories == ["NLP", "LLM"]
```

---

## 14. 마이그레이션 계획

### 14.1 SQLite → GitHub Actions Cache (v1.1)

| 단계 | 작업 | 시점 |
|---|---|---|
| 1 | Actions 워크플로우에 `cache` 스텝 추가 | v1.1 개발 시 |
| 2 | DB 파일을 `.gitignore`로 Git 추적 제외 | 캐시 전환 후 |
| 3 | 캐시 miss 시 초기화 스크립트 실행 | 캐시 전환 후 |
| 4 | Git 히스토리에서 DB 파일 제거 (BFG 사용) | 선택사항 |

### 14.2 SQLite → PostgreSQL (v2.0 이후)

| 단계 | 작업 | 시점 |
|---|---|---|
| 1 | SQLAlchemy DB URL 환경변수화 (이미 설계에 반영) | v1.1 |
| 2 | PostgreSQL 스키마 동기화 (Alembic) | 마이그레이션 전 |
| 3 | 데이터 마이그레이션 스크립트 작성 | 마이그레이션 시 |
| 4 | Supabase free tier 연결 | 트래픽 급증 시 |
| 5 | SQLite 백업 보존 30일 | 마이그레이션 후 |

### 14.3 정적 사이트 → 동적 사이트 (v2.0 이후)

| 단계 | 작업 | 시점 |
|---|---|---|
| 1 | Next.js API Routes 추가 | v1.2 |
| 2 | Vercel 배포 설정 | 트래픽 증가 시 |
| 3 | ISR (Incremental Static Regeneration) 적용 | 실시간성 필요 시 |
| 4 | GitHub Pages → Vercel 도메인 전환 | 완전 마이그레이션 시 |
