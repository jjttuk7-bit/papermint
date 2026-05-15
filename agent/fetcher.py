import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx

logger = logging.getLogger("hf_papers_agent")

HF_API_BASE = "https://huggingface.co/api"
KST = timezone(timedelta(hours=9))


def _get_headers() -> dict:
    headers = {"Accept": "application/json"}
    if token := os.getenv("HF_TOKEN"):
        headers["Authorization"] = f"Bearer {token}"
    return headers


def get_today_kst() -> str:
    return datetime.now(KST).strftime("%Y-%m-%d")


async def _fetch_with_retry(
    client: httpx.AsyncClient,
    url: str,
    params: Optional[dict] = None,
    max_retries: int = 3,
) -> dict | list:
    delay = 1
    last_exc: Exception = RuntimeError("no attempts made")

    for attempt in range(max_retries):
        try:
            response = await client.get(url, params=params, headers=_get_headers(), timeout=10.0)

            if response.status_code == 429:
                wait = int(response.headers.get("Retry-After", delay))
                logger.warning(f"429 Rate Limit — {wait}초 대기 (시도 {attempt + 1}/{max_retries})")
                await asyncio.sleep(wait)
                delay = wait
                continue

            response.raise_for_status()
            return response.json()

        except httpx.HTTPStatusError as e:
            last_exc = e
            if e.response.status_code == 400:
                # HF API가 해당 날짜 데이터를 아직 준비 안 한 경우 (빈 날짜, 미래 날짜 등)
                logger.info(f"400 Bad Request — 해당 날짜 논문 없음: {url}")
                return []
            if e.response.status_code < 500:
                raise
            logger.warning(f"5xx 에러 {e.response.status_code} — {delay}초 후 재시도 (시도 {attempt + 1}/{max_retries})")
            await asyncio.sleep(delay)
            delay *= 2

        except httpx.RequestError as e:
            last_exc = e
            logger.warning(f"요청 에러: {e} — {delay}초 후 재시도 (시도 {attempt + 1}/{max_retries})")
            await asyncio.sleep(delay)
            delay *= 2

    raise last_exc


async def _fetch_daily_list(client: httpx.AsyncClient, date: str) -> list[dict]:
    """HF daily_papers 목록 API 호출 → arxiv_id + 메타 반환."""
    data = await _fetch_with_retry(client, f"{HF_API_BASE}/daily_papers", params={"date": date})
    if not isinstance(data, list):
        logger.error(f"daily_papers API 응답 형식 오류: {type(data)}")
        return []
    return data


async def _fetch_paper_detail(
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    arxiv_id: str,
) -> Optional[dict]:
    async with semaphore:
        try:
            return await _fetch_with_retry(client, f"{HF_API_BASE}/papers/{arxiv_id}")
        except Exception as e:
            logger.error(f"[{arxiv_id}] 상세 정보 수집 실패: {e}")
            return None


def _normalize_paper(raw_entry: dict, detail: dict) -> dict:
    """daily_papers 항목 + 상세 API 응답을 DB 저장 형태로 정규화한다."""
    paper = detail.get("paper", detail)
    authors_raw = paper.get("authors", [])
    authors = [
        a.get("name", a) if isinstance(a, dict) else str(a)
        for a in authors_raw
    ]

    repos = paper.get("repos", [])
    github_repo = next(
        (r.get("url") for r in repos if isinstance(r, dict) and "github.com" in r.get("url", "")),
        None,
    )
    linked_models = [
        m.get("id") for m in paper.get("models", []) if isinstance(m, dict) and m.get("id")
    ]

    published_str = paper.get("publishedAt") or raw_entry.get("publishedAt")
    try:
        published_at = datetime.fromisoformat(published_str.replace("Z", "+00:00")) if published_str else None
    except (ValueError, AttributeError):
        published_at = None

    return {
        "arxiv_id": paper.get("id") or paper.get("arxiv_id"),
        "title_en": paper.get("title", ""),
        "abstract_en": paper.get("summary", ""),
        "ai_summary_en": paper.get("aiSummary") or paper.get("ai_summary_en"),
        "authors": authors,
        "upvotes": paper.get("upvotes", 0),
        "github_repo": github_repo,
        "project_page": paper.get("projectPage") or paper.get("project_page"),
        "linked_models": linked_models or None,
        "published_at": published_at,
        # daily_papers 테이블용
        "_rank": raw_entry.get("rank"),
        "_importance": "hot" if (paper.get("upvotes", 0) or 0) >= 100 else "normal",
    }


async def _fetch_all(date: str, max_concurrent: int = 3) -> list[dict]:
    semaphore = asyncio.Semaphore(max_concurrent)

    async with httpx.AsyncClient() as client:
        daily_list = await _fetch_daily_list(client, date)

        if not daily_list:
            logger.info(f"{date}: 논문 목록이 비어 있습니다 (휴일 또는 API 미업데이트).")
            return []

        arxiv_ids = [
            entry["paper"]["id"]
            for entry in daily_list
            if isinstance(entry.get("paper"), dict) and entry["paper"].get("id")
        ]
        logger.info(f"{date}: {len(arxiv_ids)}편 수집 시작")

        tasks = [_fetch_paper_detail(client, semaphore, aid) for aid in arxiv_ids]
        details = await asyncio.gather(*tasks)

    results = []
    entry_map = {
        entry["paper"]["id"]: entry
        for entry in daily_list
        if isinstance(entry.get("paper"), dict)
    }

    for detail in details:
        if detail is None:
            continue
        paper_data = detail.get("paper", detail)
        arxiv_id = paper_data.get("id") or paper_data.get("arxiv_id")
        raw_entry = entry_map.get(arxiv_id, {})
        results.append(_normalize_paper(raw_entry, detail))

    logger.info(f"{date}: {len(results)}/{len(arxiv_ids)}편 수집 완료")
    return results


def fetch_papers(date: Optional[str] = None) -> list[dict]:
    """동기 진입점. date 미지정 시 KST 오늘 날짜 사용."""
    if date is None:
        date = get_today_kst()
    return asyncio.run(_fetch_all(date))
