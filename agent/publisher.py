import logging
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, TypedDict

from database.models import DailyPaper, ExecutionLog, Paper, get_session, init_db
from agent.notifier import (
    notify_cost_alert,
    notify_failure,
    notify_json_failures,
    notify_partial,
    notify_success,
)

logger = logging.getLogger("hf_papers_agent")

CONTENT_DIR = Path("website/content/daily")


# ── 타입 정의 ─────────────────────────────────────────────────────────────────

class PublishResult(TypedDict):
    date: str
    total: int
    success_count: int
    fallback_count: int
    api_cost: float
    status: str  # "success" | "partial" | "failed"


# ── DB 저장 ───────────────────────────────────────────────────────────────────

def _upsert_paper(session, data: dict, date: str, prompt_version: str) -> Paper:
    """papers + daily_papers upsert. 이미 있으면 processed 필드만 업데이트."""
    paper = session.query(Paper).filter_by(arxiv_id=data["arxiv_id"]).first()

    if paper is None:
        paper = Paper(arxiv_id=data["arxiv_id"], title_en=data.get("title_en", ""))
        session.add(paper)

    # 원문 필드 (fetcher 데이터)
    paper.title_en = data.get("title_en") or paper.title_en
    paper.abstract_en = data.get("abstract_en")
    paper.ai_summary_en = data.get("ai_summary_en")
    paper.authors = data.get("authors")
    paper.upvotes = data.get("upvotes", 0)
    paper.github_repo = data.get("github_repo")
    paper.project_page = data.get("project_page")
    paper.linked_models = data.get("linked_models")
    paper.published_at = data.get("published_at")

    # 처리 결과 필드 (processor 데이터)
    paper.title_ko = data.get("title_ko")
    paper.abstract_ko = data.get("abstract_ko")
    paper.ai_summary_ko = data.get("ai_summary_ko")
    paper.contributions_en = data.get("contributions_en")
    paper.contributions_ko = data.get("contributions_ko")
    paper.one_liner_en = data.get("one_liner_en")
    paper.one_liner_ko = data.get("one_liner_ko")
    paper.categories = data.get("categories")
    paper.processed_at = datetime.now(timezone.utc)
    paper.prompt_version = prompt_version

    session.flush()  # paper.id 확보

    # daily_papers upsert
    existing = session.query(DailyPaper).filter_by(
        date=date, paper_id=paper.id
    ).first()
    if existing is None:
        session.add(DailyPaper(
            date=date,
            paper_id=paper.id,
            rank=data.get("_rank"),
            importance=data.get("_importance", "normal"),
        ))

    return paper


def _mark_published(session, papers: list[Paper]) -> None:
    for p in papers:
        p.published = True
        p.published_at = datetime.now(timezone.utc)


# ── Markdown 생성 ─────────────────────────────────────────────────────────────

def _paper_to_markdown_block(paper: Paper, rank: Optional[int]) -> str:
    rank_str = f"{rank}. " if rank else "- "
    title = paper.title_ko or paper.title_en
    arxiv_url = f"https://arxiv.org/abs/{paper.arxiv_id}"

    links = [f"[arXiv]({arxiv_url})"]
    if paper.github_repo:
        links.append(f"[GitHub]({paper.github_repo})")
    if paper.project_page:
        links.append(f"[Project]({paper.project_page})")

    cats = ", ".join(paper.categories or [])
    upvotes = paper.upvotes or 0

    lines = [
        f"### {rank_str}{title}",
        "",
        f"**카테고리**: {cats} | **upvotes**: {upvotes} | {' | '.join(links)}",
        "",
    ]

    if paper.one_liner_ko:
        lines += [f"> {paper.one_liner_ko}", ""]

    contribs = paper.contributions_ko or paper.contributions_en or []
    if contribs:
        lines.append("**핵심 기여**:")
        lines += [f"- {c}" for c in contribs]
        lines.append("")

    abstract = paper.abstract_ko or paper.abstract_en or ""
    if abstract:
        lines += ["**초록**:", "", abstract, ""]

    lines.append("---")
    return "\n".join(lines)


def _generate_markdown(papers: list[Paper], daily_entries: list[DailyPaper], date: str) -> None:
    CONTENT_DIR.mkdir(parents=True, exist_ok=True)

    rank_map = {dp.paper_id: dp.rank for dp in daily_entries}
    sorted_papers = sorted(papers, key=lambda p: rank_map.get(p.id) or 999)

    header = "\n".join([
        "---",
        f'date: "{date}"',
        f"papers_count: {len(papers)}",
        "---",
        "",
        f"# {date} 논문 요약",
        "",
    ])

    blocks = [_paper_to_markdown_block(p, rank_map.get(p.id)) for p in sorted_papers]

    output = header + "\n".join(blocks) + "\n"
    (CONTENT_DIR / f"{date}.md").write_text(output, encoding="utf-8")
    logger.info(f"Markdown 생성 완료: {CONTENT_DIR / f'{date}.md'}")


# ── Git 커밋/푸시 ─────────────────────────────────────────────────────────────

def _git_commit_push(date: str) -> bool:
    """변경 사항 커밋 후 푸시. 변경 없으면 스킵. 실패 시 False 반환."""
    try:
        subprocess.run(
            ["git", "add", "website/data/hf_papers.db", "website/content/"],
            check=True, capture_output=True,
        )
        diff = subprocess.run(
            ["git", "diff", "--staged", "--quiet"],
            capture_output=True,
        )
        if diff.returncode == 0:
            logger.info("커밋할 변경 사항 없음 — 스킵")
            return True

        subprocess.run(
            ["git", "commit", "-m", f"daily: {date} papers update"],
            check=True, capture_output=True,
        )
        subprocess.run(["git", "push"], check=True, capture_output=True)
        logger.info(f"Git push 완료: daily {date}")
        return True

    except subprocess.CalledProcessError as e:
        stderr = e.stderr.decode(errors="replace") if e.stderr else ""
        logger.error(f"Git 작업 실패: {e} — {stderr}")
        return False


# ── 공개 인터페이스 ───────────────────────────────────────────────────────────

def publish(
    papers: list[dict],
    date: str,
    api_cost: float = 0.0,
    config: Optional[dict] = None,
    job_id: Optional[str] = None,
) -> PublishResult:
    """
    fetcher + processor 결합 결과를 받아 DB 저장 → Markdown → Git push → 알림까지 수행.

    papers: 각 dict는 Paper 컬럼 키 + processor 결과 키를 포함.
    """
    if config is None:
        from agent.processor import load_config
        config = load_config()

    prompt_version = config.get("prompt_version", "v1.0")
    cost_threshold = config.get("notifier", {}).get("cost_alert_threshold", 0.50)
    job_id = job_id or f"job-{date}"

    init_db()

    started_at = datetime.now(timezone.utc)
    fallback_count = sum(1 for p in papers if not p.get("title_ko"))
    total = len(papers)

    exec_log = ExecutionLog(
        job_id=job_id,
        started_at=started_at,
        status="partial",
        papers_count=total,
        api_cost=api_cost,
        prompt_version=prompt_version,
    )

    saved_papers: list[Paper] = []
    daily_entries: list[DailyPaper] = []

    try:
        with get_session() as session:
            session.add(exec_log)

            for data in papers:
                paper = _upsert_paper(session, data, date, prompt_version)
                saved_papers.append(paper)

            session.flush()

            daily_entries = (
                session.query(DailyPaper)
                .filter_by(date=date)
                .all()
            )

        _generate_markdown(saved_papers, daily_entries, date)
        git_ok = _git_commit_push(date)

        with get_session() as session:
            _mark_published(session, saved_papers)
            log = session.query(ExecutionLog).filter_by(job_id=job_id).first()
            if log:
                log.ended_at = datetime.now(timezone.utc)
                log.status = "success" if fallback_count == 0 else "partial"

        status = "success" if (fallback_count == 0 and git_ok) else "partial"

        if fallback_count == 0:
            notify_success(date, total, api_cost)
        else:
            notify_partial(date, total - fallback_count, total, fallback_count)

        if api_cost > cost_threshold:
            notify_cost_alert(date, api_cost, cost_threshold)

        json_failures = sum(
            1 for p in papers
            if p.get("categories") == ["Survey"] and not p.get("title_ko")
        )
        if json_failures >= 3:
            notify_json_failures(date, json_failures)

    except Exception as e:
        logger.exception(f"publish() 실패: {e}")
        with get_session() as session:
            log = session.query(ExecutionLog).filter_by(job_id=job_id).first()
            if log:
                log.ended_at = datetime.now(timezone.utc)
                log.status = "failed"
                log.error_msg = str(e)[:500]
        notify_failure(date, str(e))
        return PublishResult(
            date=date, total=total, success_count=0,
            fallback_count=total, api_cost=api_cost, status="failed",
        )

    return PublishResult(
        date=date,
        total=total,
        success_count=total - fallback_count,
        fallback_count=fallback_count,
        api_cost=api_cost,
        status=status,
    )
