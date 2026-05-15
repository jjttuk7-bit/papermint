"""v1.1 마이그레이션: methodology_ko, results_ko, limitations_ko 컬럼 추가"""
import os
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

DB_PATH = Path(os.getenv("DB_PATH", "website/data/hf_papers.db"))

NEW_COLUMNS = [
    ("methodology_ko", "TEXT"),
    ("results_ko",     "TEXT"),
    ("limitations_ko", "TEXT"),
]


def migrate():
    if not DB_PATH.exists():
        print(f"DB 없음 ({DB_PATH}), 마이그레이션 스킵")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(papers)")
    existing = {row[1] for row in cur.fetchall()}

    added = []
    for col, typ in NEW_COLUMNS:
        if col not in existing:
            cur.execute(f"ALTER TABLE papers ADD COLUMN {col} {typ}")
            added.append(col)

    conn.commit()
    conn.close()

    if added:
        print(f"마이그레이션 완료: {', '.join(added)} 추가됨")
    else:
        print("마이그레이션 스킵: 컬럼이 이미 존재함")


if __name__ == "__main__":
    migrate()
