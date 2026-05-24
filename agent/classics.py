"""역대급 논문 큐레이션 rotator.

config/classics.yml에서 슬롯별(foundation/vision/language) 시드 리스트를 읽고,
DB에 이미 들어간 classic 논문을 제외하면서 슬롯별로 다음 1편씩 선택한다.

선택 규칙:
  - yml 순서대로 순회 → 첫 번째 미사용 ID
  - 모두 사용됐으면 가장 오래전에 사용된 ID부터 재선택 (순환)
  - 일간 논문에 동일 ID가 있으면 그 슬롯은 그날 스킵 (중복 노출 방지)

반환: [{"slot": "foundation", "arxiv_id": "..."}, ...] 형태 (최대 3개)
"""
import logging
from datetime import datetime
from pathlib import Path
from typing import Iterable, Optional

import yaml

from database.models import Paper, get_session
from agent.fetcher import fetch_papers_by_ids

logger = logging.getLogger("hf_papers_agent")

SLOTS = ("foundation", "vision", "language")
DEFAULT_CONFIG_PATH = Path(__file__).resolve().parents[1] / "config" / "classics.yml"


def load_classics_config(path: Optional[Path] = None) -> dict[str, list[str]]:
    path = path or DEFAULT_CONFIG_PATH
    if not path.exists():
        logger.warning(f"classics.yml 없음 ({path}) — classics 스킵")
        return {s: [] for s in SLOTS}
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return {s: [str(x) for x in (data.get(s) or [])] for s in SLOTS}


def _used_ids_by_slot() -> dict[str, dict[str, Optional[datetime]]]:
    """DB에서 is_classic=TRUE 논문의 슬롯별 (arxiv_id → processed_at) 매핑.

    재선택 우선순위 결정용으로 processed_at도 함께 반환.
    """
    result: dict[str, dict[str, Optional[datetime]]] = {s: {} for s in SLOTS}
    with get_session() as session:
        rows = (
            session.query(Paper.arxiv_id, Paper.classic_slot, Paper.processed_at)
            .filter(Paper.is_classic.is_(True))
            .all()
        )
        for arxiv_id, slot, processed_at in rows:
            if slot in result:
                result[slot][arxiv_id] = processed_at
    return result


def _pick_next(seeds: list[str], used: dict[str, Optional[datetime]], exclude: set[str]) -> Optional[str]:
    """yml seeds에서 다음 후보 1개 선택."""
    # 1) 미사용 + exclude되지 않은 첫 ID
    for aid in seeds:
        if aid not in used and aid not in exclude:
            return aid
    # 2) 모두 사용됨 → 가장 오래된 used 중 exclude 제외하고 처음 것
    if used:
        ordered = sorted(used.items(), key=lambda kv: (kv[1] is None, kv[1]))
        for aid, _ in ordered:
            if aid not in exclude:
                return aid
    return None


def select_classics(exclude_ids: Optional[Iterable[str]] = None) -> list[dict]:
    """슬롯별로 다음 classic arxiv_id를 골라 [{"slot", "arxiv_id"}] 반환."""
    exclude = set(exclude_ids or [])
    config = load_classics_config()
    used = _used_ids_by_slot()

    picks: list[dict] = []
    for slot in SLOTS:
        seeds = config.get(slot, [])
        if not seeds:
            logger.info(f"[classics] {slot}: 시드 없음 — 스킵")
            continue
        chosen = _pick_next(seeds, used.get(slot, {}), exclude)
        if chosen is None:
            logger.info(f"[classics] {slot}: 모든 후보 제외됨 — 스킵")
            continue
        picks.append({"slot": slot, "arxiv_id": chosen})
        logger.info(f"[classics] {slot}: {chosen} 선택")
    return picks


def fetch_classics(exclude_ids: Optional[Iterable[str]] = None) -> list[dict]:
    """오늘자 classic 후보를 선택하고 HF에서 메타까지 가져와 raw paper dict 반환.

    각 dict에는 is_classic=True, classic_slot=<slot> 키가 추가된다.
    """
    picks = select_classics(exclude_ids=exclude_ids)
    if not picks:
        return []

    arxiv_ids = [p["arxiv_id"] for p in picks]
    raw_papers = fetch_papers_by_ids(arxiv_ids)

    slot_by_id = {p["arxiv_id"]: p["slot"] for p in picks}
    enriched: list[dict] = []
    for paper in raw_papers:
        aid = paper.get("arxiv_id")
        if not aid or aid not in slot_by_id:
            continue
        enriched.append({
            **paper,
            "is_classic": True,
            "classic_slot": slot_by_id[aid],
            "_importance": "normal",
            "_rank": None,
        })

    if len(enriched) < len(picks):
        missing = set(arxiv_ids) - {p["arxiv_id"] for p in enriched}
        logger.warning(f"[classics] {len(missing)}편 메타 수집 실패: {missing}")

    return enriched
