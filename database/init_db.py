"""DB 초기화 스크립트. 테이블이 없으면 생성하고, 있으면 그대로 둔다."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from database.models import init_db

if __name__ == "__main__":
    engine = init_db()
    print(f"DB 초기화 완료: {engine.url}")
