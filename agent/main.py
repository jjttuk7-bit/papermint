import sys
from pathlib import Path

# python agent/main.py 로 실행 시 프로젝트 루트를 sys.path에 추가
_root = Path(__file__).parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import argparse
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from database.models import Paper, get_session, init_db
from agent.fetcher import fetch_papers, get_today_kst, get_yesterday_utc
from agent.processor import load_config, process_with_fallback
from agent.publisher import publish

# GPT-4o 기준 논문당 예상 비용 (~800 input + ~600 output tokens)
_COST_PER_PAPER_USD = 0.010

logger = logging.getLogger("hf_papers_agent")


# ── 로깅 설정 ─────────────────────────────────────────────────────────────────

def _setup_logging(date: str) -> None:
    log_dir = Path("logs/agent")
    log_dir.mkdir(parents=True, exist_ok=True)

    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s - %(message)s")

    root = logging.getLogger("hf_papers_agent")
    root.setLevel(logging.DEBUG)

    # 콘솔: INFO 이상
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    ch.setFormatter(fmt)
    root.addHandler(ch)

    # 날짜별 파일: DEBUG 이상
    fh = logging.FileHandler(log_dir / f"{date}.log", encoding="utf-8")
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(fmt)
    root.addHandler(fh)

    # 에러 전용 누적 파일
    eh = logging.FileHandler(log_dir / "errors.log", encoding="utf-8")
    eh.setLevel(logging.ERROR)
    eh.setFormatter(fmt)
    root.addHandler(eh)


# ── CLI 인수 파싱 ─────────────────────────────────────────────────────────────

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="HF Papers 한국어 요약 파이프라인")
    parser.add_argument(
        "--date", "-d",
        help="처리 날짜 (YYYY-MM-DD). 미지정 시 KST 오늘 날짜.",
    )
    parser.add_argument(
        "--reprocess",
        metavar="ARXIV_ID",
        help="특정 논문 재처리 (processed_at 초기화 후 재실행).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="수집/처리 결과 확인만. DB 저장 및 git push 없음.",
    )
    return parser.parse_args()


def _resolve_date(args: argparse.Namespace) -> tuple[str, str]:
    """(db_date, hf_fetch_date) 반환.

    수동 지정(--date / FETCH_DATE)이면 두 날짜가 같다.
    자동 실행이면 db_date=KST 오늘, hf_fetch_date=UTC 어제 (HF는 UTC 00:00에 전날 데이터가 완성됨).
    """
    manual = args.date or os.getenv("FETCH_DATE")
    if manual:
        return manual, manual
    return get_today_kst(), get_yesterday_utc()


# ── 재처리 헬퍼 ──────────────────────────────────────────────────────────────

def _load_paper_for_reprocess(arxiv_id: str) -> dict | None:
    """DB에서 논문을 불러오고 processed_at/published을 초기화한다."""
    with get_session() as session:
        paper = session.query(Paper).filter_by(arxiv_id=arxiv_id).first()
        if paper is None:
            logger.error(f"[reprocess] arxiv_id '{arxiv_id}' 를 DB에서 찾을 수 없습니다.")
            return None

        paper.processed_at = None
        paper.published = False

        return {
            "arxiv_id": paper.arxiv_id,
            "title_en": paper.title_en,
            "abstract_en": paper.abstract_en,
            "ai_summary_en": paper.ai_summary_en,
            "authors": paper.authors,
            "upvotes": paper.upvotes,
            "github_repo": paper.github_repo,
            "project_page": paper.project_page,
            "linked_models": paper.linked_models,
            "published_at": paper.published_at,
            "_rank": None,
            "_importance": "normal",
        }


def _get_date_for_paper(arxiv_id: str) -> str | None:
    """재처리 시 해당 논문의 daily_papers 날짜를 반환한다."""
    from database.models import DailyPaper
    with get_session() as session:
        entry = (
            session.query(DailyPaper)
            .join(Paper)
            .filter(Paper.arxiv_id == arxiv_id)
            .order_by(DailyPaper.date.desc())
            .first()
        )
        return entry.date if entry else None


# ── 파이프라인 ────────────────────────────────────────────────────────────────

def _run_pipeline(
    raw_papers: list[dict],
    date: str,
    config: dict,
    dry_run: bool,
    job_id: str,
) -> int:
    """fetch 이후 단계: process → publish. 성공 시 0, 실패 시 1 반환."""
    logger.info(f"[{date}] {len(raw_papers)}편 처리 시작")

    processed: list[dict] = []

    for i, paper in enumerate(raw_papers, 1):
        arxiv_id = paper.get("arxiv_id", "?")
        logger.info(f"[{i}/{len(raw_papers)}] 처리 중: {arxiv_id}")

        if dry_run:
            logger.info(f"  [dry-run] 스킵 -{paper.get('title_en', '')[:60]}")
            continue

        result = process_with_fallback(paper, config)
        processed.append({**paper, **result})

        status = "✅" if result.get("title_ko") else "⚠️ fallback"
        logger.info(f"  {status} {arxiv_id}: {result.get('title_ko') or result.get('one_liner_en', '')[:60]}")

    if dry_run:
        logger.info(f"[dry-run] {len(raw_papers)}편 확인 완료 -DB 저장/Git push 없음")
        return 0

    if not processed:
        logger.info(f"[{date}] 처리된 논문 없음 -스킵")
        return 0

    api_cost = len(processed) * _COST_PER_PAPER_USD
    result = publish(processed, date, api_cost=api_cost, config=config, job_id=job_id)

    logger.info(
        f"[{date}] 완료 -상태: {result['status']} | "
        f"{result['success_count']}/{result['total']}편 성공 | "
        f"fallback: {result['fallback_count']}편 | "
        f"비용: ${result['api_cost']:.3f}"
    )

    return 0 if result["status"] != "failed" else 1


# ── 진입점 ────────────────────────────────────────────────────────────────────

def main() -> int:
    args = _parse_args()
    date, hf_date = _resolve_date(args)

    _setup_logging(date)
    logger.info(f"=== papermint 시작 | 게시 날짜: {date} | HF 조회 날짜: {hf_date} | dry-run: {args.dry_run} ===")

    config = load_config()
    init_db()

    job_id = f"job-{date}-{datetime.now(timezone.utc).strftime('%H%M%S')}"

    # ── 재처리 모드 ───────────────────────────────────────────────────────────
    if args.reprocess:
        paper = _load_paper_for_reprocess(args.reprocess)
        if paper is None:
            return 1

        paper_date = _get_date_for_paper(args.reprocess) or date
        logger.info(f"[reprocess] {args.reprocess} | 날짜: {paper_date}")
        return _run_pipeline([paper], paper_date, config, args.dry_run, job_id)

    # ── 일반 모드 ─────────────────────────────────────────────────────────────
    logger.info(f"[{date}] 논문 수집 시작 (HF 조회: {hf_date})")
    raw_papers = fetch_papers(hf_date)

    if not raw_papers:
        logger.info(f"[{date}] 논문 없음 (휴일 또는 API 미업데이트) -종료")
        return 0

    top_n = config.get("fetcher", {}).get("top_papers", 0)
    if top_n and top_n > 0:
        total_fetched = len(raw_papers)
        raw_papers = sorted(raw_papers, key=lambda p: p.get("upvotes") or 0, reverse=True)[:top_n]
        logger.info(f"[{date}] upvotes 상위 {len(raw_papers)}편 선별 (전체 수집: {total_fetched}편)")

    return _run_pipeline(raw_papers, date, config, args.dry_run, job_id)


if __name__ == "__main__":
    sys.exit(main())
