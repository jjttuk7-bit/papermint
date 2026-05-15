# OPERATIONS.md — 운영 매뉴얼

> 이 문서는 HF Papers 한국어 요약 서비스의 일상 운영, 장애 대응, 비용 관리, 유지보수 가이드다.
> 문제가 생기면 이 파일부터 열어라.

---

## 1. 일상 모니터링 체크리스트

매일 오전 09:15 KST (Actions 실행 후 15분) 확인.

### 1.1 GitHub Actions 확인

1. [Actions 탭](https://github.com/{your-repo}/actions) → `Daily Papers Fetch & Publish` 워크플로우
2. 최신 실행 상태 확인:
   - ✅ `success` → 정상
   - ⚠️ `partial` → Discord 알림 확인, DB에서 실패 논문 확인
   - ❌ `failed` → 섹션 3 장애 대응 참조

### 1.2 Discord 알림 확인

| 메시지 유형 | 의미 | 조치 |
|---|---|---|
| `✅ YYYY-MM-DD: N편 처리 완료 ($X.XX)` | 정상 | 없음 |
| `⚠️ ... N편 영문 fallback` | 일부 번역 실패 | 섹션 3.3 참조 |
| `❌ ... 실행 실패` | 전체 파이프라인 실패 | 섹션 3.1 참조 |
| `💰 비용 $X.XX 초과` | LLM 비용 이상 | 섹션 4 참조 |
| `🔧 JSON 파싱 실패 N건` | 프롬프트 품질 저하 | 섹션 3.3 참조 |

### 1.3 주간 확인 (매주 월요일)

- [ ] LLM API 비용 주간 합계 (OpenAI Dashboard / Anthropic Console)
- [ ] execution_logs 7일치 success/failed/partial 비율
- [ ] 웹사이트 방문자 수 (Google Analytics)
- [ ] 이메일 구독자 증감 (Buttondown Dashboard)
- [ ] JSON 파싱 성공률 확인

---

## 2. 수동 실행 방법

### 2.1 특정 날짜 재실행

```bash
# 로컬에서 특정 날짜 실행
FETCH_DATE=2026-05-10 python agent/main.py

# GitHub Actions 수동 트리거 (UI)
# 1. Actions 탭 → "Daily Papers Fetch & Publish"
# 2. "Run workflow" 버튼 클릭
# 3. (선택) FETCH_DATE 입력 후 실행
```

### 2.2 특정 논문 재처리

```bash
# 특정 arxiv_id 재번역 (processed_at 초기화 후 재실행)
python agent/main.py --reprocess 2505.12345

# 또는 DB 직접 수정 후 재실행
python -c "
from database.models import Paper, get_session
with get_session() as s:
    p = s.query(Paper).filter_by(arxiv_id='2505.12345').first()
    p.processed_at = None
    p.published = False
    s.commit()
print('초기화 완료')
"
python agent/main.py
```

### 2.3 DB 초기화 (긴급 시)

```bash
# ⚠️ 경고: 모든 데이터 삭제. 반드시 백업 후 실행
cp data/hf_papers.db data/hf_papers.db.bak.$(date +%Y%m%d)
python database/init_db.py
```

---

## 3. 장애 대응 시나리오

### 3.1 파이프라인 전체 실패

**증상**: GitHub Actions `failed`, Discord에 `❌` 알림

**진단 순서**:

```
1. Actions 로그에서 에러 메시지 확인
   ├── "HF API" 포함 → 3.2 HF API 장애
   ├── "openai" / "anthropic" 포함 → 3.4 LLM API 장애
   ├── "sqlite" / "database" 포함 → 3.5 DB 장애
   └── "import" / "ModuleNotFound" → 3.6 의존성 문제
```

### 3.2 HF Papers API 장애

**증상**: `status 5xx`, `Connection refused`, `Timeout`

```bash
# 수동으로 HF API 상태 확인
curl -s "https://huggingface.co/api/daily_papers?date=$(date +%Y-%m-%d)" | head -c 200
```

**조치**:
- HF API 다운 확인 → [HF Status](https://status.huggingface.co/) 참조
- 일시적 장애면 2~4시간 후 `workflow_dispatch`로 수동 재실행
- 당일 논문 없으면 그냥 스킵 (데이터 손실 없음)

### 3.3 JSON 파싱 실패 / 번역 품질 저하

**증상**: Discord에 `⚠️ N편 영문 fallback` 또는 `🔧 JSON 파싱 실패`

**진단**:

```python
# DB에서 처리 실패 논문 확인
from database.models import Paper, get_session
with get_session() as s:
    failed = s.query(Paper).filter(
        Paper.processed_at.isnot(None),
        Paper.title_ko.is_(None)
    ).all()
    for p in failed:
        print(p.arxiv_id, p.title_en[:50])
```

**조치 A — 일시적 (1~2편)**:
- 해당 논문 `processed_at = None`으로 초기화 후 재실행

**조치 B — 반복적 (3편 이상 연속)**:
- `PROMPTS.md` 품질 저하 감지 기준 확인
- 프롬프트 버전 업 또는 이전 버전으로 롤백:

```yaml
# config.yaml
prompt_version: "v0.9"  # 롤백
```

### 3.4 LLM API 장애

**증상**: `openai.APIError`, `anthropic.APIStatusError`

| 에러 | 원인 | 조치 |
|---|---|---|
| `429 Too Many Requests` | Rate Limit 초과 | 30분 대기 후 재실행 |
| `401 Unauthorized` | API 키 만료/오류 | GitHub Secrets에서 키 재발급 후 교체 |
| `500 Internal Server Error` | LLM 서버 일시 장애 | 30분~1시간 후 재실행 |
| `insufficient_quota` | 크레딧 소진 | OpenAI/Anthropic 대시보드에서 충전 |

**API 키 교체 방법**:
```
GitHub Repository → Settings → Secrets and variables → Actions
→ 해당 Secret 선택 → Update → 새 API 키 입력 → Save
```

### 3.5 DB 장애

**증상**: `sqlite3.OperationalError`, `database is locked`

```bash
# DB 파일 상태 확인
python -c "
import sqlite3
conn = sqlite3.connect('data/hf_papers.db')
print('테이블:', conn.execute('SELECT name FROM sqlite_master WHERE type=\"table\"').fetchall())
print('논문 수:', conn.execute('SELECT COUNT(*) FROM papers').fetchone())
conn.close()
"
```

**조치**:
- "database is locked" → 다른 프로세스 종료 후 재실행
- 파일 손상 → Git 히스토리에서 이전 DB 복구:

```bash
git log --oneline data/hf_papers.db | head -5
git checkout {commit_hash} -- data/hf_papers.db
```

### 3.6 의존성 문제

**증상**: `ModuleNotFoundError`, `ImportError`

```bash
# 의존성 재설치
pip install -r requirements.txt --force-reinstall

# 버전 충돌 확인
pip check
```

---

## 4. 비용 관리

### 4.1 LLM API 비용 현황

| 구분 | 예상값 | 임계값 (알림) | 확인 방법 |
|---|---|---|---|
| 일일 비용 | ~$0.15 | $0.50 | execution_logs.api_cost |
| 월간 비용 | ~$4.50 | $15.00 | OpenAI Dashboard |

### 4.2 비용 추적 쿼리

```python
# 최근 7일 비용 확인
from database.models import ExecutionLog, get_session
from datetime import datetime, timedelta

with get_session() as s:
    logs = s.query(ExecutionLog).filter(
        ExecutionLog.started_at >= datetime.utcnow() - timedelta(days=7),
        ExecutionLog.status != 'failed'
    ).all()
    
    total = sum(l.api_cost or 0 for l in logs)
    print(f"최근 7일 총 비용: ${total:.4f}")
    print(f"일평균 비용: ${total/7:.4f}")
    
    for log in logs:
        print(f"  {log.started_at.date()} | {log.status} | ${log.api_cost:.4f} | {log.papers_count}편 | {log.prompt_version}")
```

### 4.3 비용 급증 시 대응

**비용이 일 $0.50 초과 시**:

1. 당일 처리 논문 수 확인 (평소보다 많으면 HF 큐레이션 증가)
2. 토큰 사용량 확인 (OpenAI Usage 탭에서 논문별 토큰 확인)
3. 프롬프트 최적화 검토:
   - 초록 길이를 500 토큰으로 제한
   - ai_summary_en이 있으면 abstract_en 생략

```yaml
# config.yaml — 비용 절감 옵션
processor:
  max_abstract_tokens: 500   # 초록 최대 토큰 수
  skip_abstract_if_summary: true  # ai_summary 있으면 abstract 생략
```

---

## 5. 웹사이트 배포 관리

### 5.1 배포 흐름 확인

```
에이전트 실행 완료
    │
    ▼
git commit & push (DB + Markdown)
    │
    ▼
GitHub Actions "build" job 시작
    │
    ├── 성공 → gh-pages 브랜치 업데이트 → 사이트 반영 (보통 1~2분)
    └── 실패 → Actions 로그 확인 → 5.2 빌드 실패 대응
```

### 5.2 빌드 실패 대응

```bash
# 로컬에서 빌드 테스트
cd website
npm ci
npm run build

# 에러 확인 후 수정 → push
```

### 5.3 사이트 배포 강제 실행

```bash
# 빌드만 별도 실행 (에이전트 없이)
# GitHub Actions → "build" job만 수동 트리거
# 또는:
cd website
npm run build
npx gh-pages -d out
```

---

## 6. 데이터 관리

### 6.1 DB 통계 확인

```python
from database.models import Paper, DailyPaper, ExecutionLog, get_session
from sqlalchemy import func

with get_session() as s:
    # 전체 현황
    total = s.query(func.count(Paper.id)).scalar()
    processed = s.query(func.count(Paper.id)).filter(Paper.processed_at.isnot(None)).scalar()
    published = s.query(func.count(Paper.id)).filter(Paper.published == True).scalar()
    fallback = s.query(func.count(Paper.id)).filter(
        Paper.processed_at.isnot(None), Paper.title_ko.is_(None)
    ).scalar()
    
    print(f"전체 논문: {total}편")
    print(f"처리 완료: {processed}편 ({processed/total*100:.1f}%)")
    print(f"게시 완료: {published}편")
    print(f"영문 fallback: {fallback}편 ({fallback/total*100:.1f}%)")
```

### 6.2 오래된 실행 로그 정리

```python
# 90일 이상 된 로그 삭제
from database.models import ExecutionLog, get_session
from datetime import datetime, timedelta

with get_session() as s:
    cutoff = datetime.utcnow() - timedelta(days=90)
    deleted = s.query(ExecutionLog).filter(ExecutionLog.started_at < cutoff).delete()
    s.commit()
    print(f"삭제된 로그: {deleted}건")
```

### 6.3 DB 백업 (수동)

```bash
# 로컬 백업
cp data/hf_papers.db "backups/hf_papers_$(date +%Y%m%d_%H%M%S).db"

# Git은 자동으로 DB 변경을 추적하므로 별도 백업 필수성 낮음
# 다만 대규모 재처리 전에는 수동 백업 권장
```

---

## 7. 환경 설정 가이드

### 7.1 필수 환경변수 (GitHub Secrets)

| 변수명 | 필수 여부 | 설명 | 발급 위치 |
|---|---|---|---|
| `OPENAI_API_KEY` | 필수 | GPT-4o 호출 | platform.openai.com |
| `ANTHROPIC_API_KEY` | 권장 | Claude 백업 | console.anthropic.com |
| `HF_TOKEN` | 권장 | HF API Rate Limit 향상 | huggingface.co/settings/tokens |
| `DISCORD_WEBHOOK` | P1 | Discord 알림 | Discord 채널 설정 |
| `BUTTONDOWN_API_KEY` | P1 | 이메일 구독 발송 | buttondown.email |
| `SLACK_WEBHOOK` | P2 | Slack 알림 | Slack App 설정 |

### 7.2 로컬 개발 환경 설정

```bash
# 1. 저장소 클론
git clone https://github.com/{your-repo}/hf-papers-ko.git
cd hf-papers-ko

# 2. Python 환경
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. 환경변수 설정
cp .env.example .env
# .env 파일에 API 키 입력

# 4. DB 초기화
python database/init_db.py

# 5. 테스트 실행
python agent/main.py --dry-run  # 실제 DB 저장 없이 테스트

# 6. 웹사이트 로컬 실행
cd website
npm ci
npm run dev
```

### 7.3 config.yaml 설정 항목

```yaml
# config.yaml 전체 항목
agent:
  fetch_date: "today"           # "today" 또는 "YYYY-MM-DD"
  max_papers: 20                # 최대 처리 논문 수
  dry_run: false                # true면 DB 저장 없이 테스트

processor:
  prompt_version: "v1.0"        # 사용할 프롬프트 버전
  max_abstract_tokens: 800      # 초록 최대 토큰 수 (비용 제어)
  fallback_to_english: true     # LLM 실패 시 영문 fallback 허용

database:
  path: "data/hf_papers.db"    # SQLite 파일 경로

categories:                     # 카테고리 태그 풀 (SSOT)
  - NLP
  - CV
  - Multimodal
  - RL
  - Efficiency
  - Medical AI
  - Audio
  - Video
  - Robotics
  - Theory
  - Survey
  - Agent
  - Alignment

notifications:
  discord: true
  email: true
  slack: false
  cost_alert_threshold: 0.50    # 일일 비용 알림 임계값 ($)
```

---

## 8. 정기 유지보수 작업

### 8.1 월간 작업

| 작업 | 방법 | 소요 시간 |
|---|---|---|
| LLM API 비용 정산 | OpenAI/Anthropic 대시보드 | 5분 |
| 번역 품질 샘플링 | 무작위 5~10편 수동 검토 | 20분 |
| 실행 로그 정리 | 섹션 6.2 쿼리 실행 | 2분 |
| 의존성 보안 업데이트 | `pip list --outdated` / `npm outdated` | 30분 |

### 8.2 분기 작업

| 작업 | 방법 | 소요 시간 |
|---|---|---|
| LLM 모델 버전 업 검토 | OpenAI/Anthropic 최신 모델 성능 비교 | 1시간 |
| 카테고리 태그 풀 검토 | 최근 논문 트렌드 반영 여부 확인 | 30분 |
| DB 크기 확인 | `ls -lh data/hf_papers.db` | 2분 |
| GitHub Actions 사용량 확인 | Settings → Billing | 5분 |

---

## 9. 유용한 명령어 모음

```bash
# 오늘 처리 현황 확인
python -c "
from database.models import *
from datetime import date
with get_session() as s:
    today = str(date.today())
    dp = s.query(DailyPaper).filter_by(date=today).all()
    print(f'오늘({today}) 논문: {len(dp)}편')
    for d in dp:
        p = d.paper
        status = '✅' if p.title_ko else '⚠️'
        print(f'  {status} [{d.rank}] {p.arxiv_id}: {p.title_en[:50]}')
"

# 최근 5회 실행 요약
python -c "
from database.models import *
with get_session() as s:
    logs = s.query(ExecutionLog).order_by(ExecutionLog.started_at.desc()).limit(5).all()
    for l in logs:
        duration = (l.ended_at - l.started_at).seconds if l.ended_at and l.started_at else '?'
        print(f'{l.started_at.date()} | {l.status:8} | {l.papers_count}편 | \${l.api_cost:.4f} | {duration}s | {l.prompt_version}')
"

# DB 파일 크기 확인
ls -lh data/hf_papers.db

# 웹사이트 빌드 로컬 테스트
cd website && npm run build && echo "빌드 성공"
```
