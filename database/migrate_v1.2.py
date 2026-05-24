"""v1.2 마이그레이션: is_classic, classic_slot 컬럼 추가 + classic 인덱스 생성."""
import os
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

DB_PATH = Path(os.getenv("DB_PATH", "website/data/hf_papers.db"))

NEW_COLUMNS = [
    ("is_classic",   "BOOLEAN DEFAULT FALSE"),
    ("classic_slot", "TEXT"),
]

NEW_INDEX = ("idx_papers_classic", "papers", "is_classic, classic_slot")


def migrate():
    if not DB_PATH.exists():
        print(f"DB 없음 ({DB_PATH}), 마이그레이션 스킵")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("PRAGMA table_info(papers)")
    existing_cols = {row[1] for row in cur.fetchall()}
    added_cols = []
    for col, typ in NEW_COLUMNS:
        if col not in existing_cols:
            cur.execute(f"ALTER TABLE papers ADD COLUMN {col} {typ}")
            added_cols.append(col)

    cur.execute("SELECT name FROM sqlite_master WHERE type='index'")
    existing_idx = {row[0] for row in cur.fetchall()}
    added_idx = False
    idx_name, table, cols = NEW_INDEX
    if idx_name not in existing_idx:
        cur.execute(f"CREATE INDEX {idx_name} ON {table}({cols})")
        added_idx = True

    conn.commit()
    conn.close()

    parts = []
    if added_cols:
        parts.append(f"컬럼 추가: {', '.join(added_cols)}")
    if added_idx:
        parts.append(f"인덱스 추가: {idx_name}")
    if parts:
        print("마이그레이션 완료 - " + " / ".join(parts))
    else:
        print("마이그레이션 스킵: 이미 적용됨")


if __name__ == "__main__":
    migrate()
