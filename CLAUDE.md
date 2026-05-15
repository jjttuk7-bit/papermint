# CLAUDE.md

<!--
  ┌─────────────────────────────────────────────────────────────┐
  │  Claude Code는 이 파일을 세션 시작 시 자동으로 읽는다.        │
  │  ⚡ 브리핑 → 📍 현재 상태 → 📐 규칙 순으로 읽고 작업 시작.  │
  └─────────────────────────────────────────────────────────────┘
-->

---

## ⚡ 브리핑 — 항상 여기서 시작 (필독, 나머지는 필요할 때만)

| 항목 | 내용 |
|---|---|
| **프로젝트** | HF Papers 한글 요약 자동화 에이전트 (papermint) |
| **한 줄 목표** | 매일 HF Papers 논문을 수집 → LLM 분석+번역 → 한국어 웹사이트 자동 게시 |
| **Python 스택** | Python 3.11 / httpx(async) / SQLAlchemy 2.0 / openai + anthropic / PyYAML |
| **Web 스택** | Next.js 14 App Router / TypeScript / Tailwind CSS / shadcn/ui / better-sqlite3 |
| **DB** | SQLite (`data/hf_papers.db`) — Git 커밋으로 지속성 유지 (MVP 전략) |
| **배포** | GitHub Actions (cron 매일 UTC 00:00 = KST 09:00) → GitHub Pages |
| **알림** | Buttondown(이메일) / Discord Webhook / Slack Webhook |

### 파이프라인 3단계

```
[Fetcher]   HF API 비동기 수집 (asyncio Semaphore 3)
    ↓
[Processor] LLM 1회 호출 → 분류 + 요약 + 한글번역 동시 처리
    ↓
[Publisher] DB 저장 → Markdown 생성 → Git push → 알림 발송
```

### 디렉토리 한눈에

```
papermint/
├── agent/
│   ├── main.py            # 진입점
│   ├── fetcher.py         # HF API 수집 (asyncio)
│   ├── processor.py       # LLM 분석+번역 통합
│   ├── publisher.py       # DB저장 + 배포 + 알림
│   ├── notifier.py        # 이메일/Discord/Slack
│   └── prompts/
│       └── v1_unified.txt # 현재 프롬프트
├── database/
│   ├── schema.sql
│   └── models.py          # JsonType TypeDecorator 포함
├── data/
│   └── hf_papers.db       # ← Git 추적 대상 (MVP 지속성)
├── website/               # Next.js 14
├── .github/workflows/
│   └── daily-papers.yml
├── config.yaml            # 카테고리 태그 SSOT + 프롬프트 버전
├── SESSION.md             # ← 현재 작업 상태 (매 세션 업데이트 필수)
├── DECISIONS.md           # 설계 결정 이유 기록
├── PROMPTS.md             # 프롬프트 버전 관리
└── OPERATIONS.md          # 운영/장애 대응
```

### 핵심 설계 결정 요약 (상세 이유 → DECISIONS.md)

| 결정 | 이유 |
|---|---|
| Processor 통합 (LLM 1회) | Analyzer+Translator 분리 시 비용 2배, 컨텍스트 단절 |
| DB Git 커밋 허용 | GitHub Actions 클린 환경 → 커밋 안 하면 누적 데이터 소실 |
| JsonType TypeDecorator | `authors`/`categories`/`contributions_*` 자동 직렬화 |
| 카테고리 config.yaml SSOT | 코드·프롬프트 하드코딩 시 수정 지점 분산 문제 |
| safe_parse_json 3단계 | LLM이 JSON 앞뒤에 텍스트 붙이는 경우 대응 |

---

## 📍 현재 상태 — SESSION.md를 먼저 읽어라

> **세션 시작 시 SESSION.md를 확인한다. 없으면 새로 만든다.**
> 아래는 SESSION.md가 없을 때 초기 상태 기준이다.

```
완료  : 없음 (초기 상태)
진행중: 없음
다음  : schema.sql + models.py (TRD.md 3절 기준)
```

**세션 시작 주문 패턴**:
```
SESSION.md 읽고, [모듈명] 작업 이어서 시작해줘.
참조: [TRD.md N절] 만 열면 된다.
```

---

## 📐 개발 규칙 — 코드 작성 전 반드시 확인

1. **카테고리 태그 수정** → `config.yaml`만. 코드/프롬프트 하드코딩 금지
2. **프롬프트 수정** → `PROMPTS.md`에 버전·이유·아카이브 기록 먼저, 그 다음 변경
3. **DB 스키마 변경** → Alembic 마이그레이션 파일 생성 필수
4. **JSON 필드 처리** → `JsonType` 경유. `json.dumps()` 직접 호출 금지
5. **LLM 호출** → `process_with_fallback()` 경유 (GPT-4o → Claude → 영문 fallback)
6. **시크릿** → `os.getenv()` 사용. 코드·DB·로그 하드코딩 절대 금지
7. **에러 발생** → `OPERATIONS.md` 3절 장애 시나리오 먼저 확인

---

## 📚 상세 참조 인덱스 — 필요한 섹션만 열 것

| 궁금한 것 | 파일 | 섹션 |
|---|---|---|
| DB 스키마 SQL | `TRD.md` | 3.2 |
| ORM 모델 + JsonType 코드 | `TRD.md` | 3.3 |
| Fetcher 비동기 설계 | `TRD.md` | 7절 |
| safe_parse_json 코드 | `TRD.md` | 6절 |
| process_with_fallback 코드 | `TRD.md` | 6절 |
| GitHub Actions YAML | `TRD.md` | 11절 |
| 에러 재시도 정책 | `TRD.md` | 8절 |
| LLM 프롬프트 전문 + 예시 | `PROMPTS.md` | v1.0 섹션 |
| 프롬프트 롤백 방법 | `PROMPTS.md` | 롤백 절차 |
| 장애 대응 시나리오 | `OPERATIONS.md` | 3절 |
| 비용 추적 쿼리 | `OPERATIONS.md` | 4절 |
| 수동 실행 방법 | `OPERATIONS.md` | 2절 |
| 기능 요구사항 전체 | `PRD.md` | 3절 |
| 설계 결정 이유 | `DECISIONS.md` | 전체 |

---
<!--
  ================================================================
  이하: 상세 레퍼런스 섹션
  Claude Code가 브리핑만으로 부족할 때만 참조.
  ================================================================
-->

---

## 시스템 아키텍처 상세

### 파이프라인

```
사용자 요청/스케줄
    ↓
GitHub Actions (cron UTC 00:00)
    ↓
Fetcher (httpx asyncio)  ─→  HF Papers API
    ↓
Processor (LLM 1회)      ─→  OpenAI GPT-4o (주) / Claude (백업)
    ↓
Publisher
    ├─→ SQLite DB (data/hf_papers.db)
    ├─→ Markdown (website/content/daily/)
    └─→ Notifier ─→ Discord / Buttondown / Slack
    ↓
GitHub Actions (build)
    ↓
GitHub Pages (정적 사이트)
```

### 에이전트 모듈 인터페이스

```python
# fetcher.py
def fetch_papers(date: str) -> list[dict]

# processor.py
def process(paper: dict) -> ProcessedPaper   # 단일 인터페이스 유지
def process_with_fallback(paper: dict) -> ProcessedPaper

# publisher.py
def publish(papers: list[ProcessedPaper]) -> PublishResult
```

---

## 기술 스택

### 에이전트 (Backend)

| 목적 | 라이브러리 | 버전 |
|---|---|---|
| HTTP 비동기 | `httpx` | ^0.27 |
| HTTP 동기 폴백 | `requests` | ^2.31 |
| LLM (주) | `openai` | ^1.0 |
| LLM (백업) | `anthropic` | ^0.25 |
| ORM | `sqlalchemy` | ^2.0 |
| 마이그레이션 | `alembic` | ^1.13 |
| 설정 | `pyyaml` | ^6.0 |
| 환경변수 | `python-dotenv` | ^1.0 |
| 날짜 | `python-dateutil` | ^2.9 |

### 웹사이트 (Frontend)

| 목적 | 패키지 | 버전 |
|---|---|---|
| 프레임워크 | `next` | ^14 |
| 언어 | `typescript` | ^5 |
| 스타일링 | `tailwindcss` | ^3 |
| UI | `@radix-ui/*` (shadcn/ui) | 최신 |
| 마크다운 | `react-markdown` | ^9 |
| DB | `better-sqlite3` | ^9 |
| 날짜 | `date-fns` | ^3 |

### 인프라 비용

| 서비스 | 용도 | 비용 |
|---|---|---|
| GitHub | 소스 + Pages + Actions | 무료 |
| Buttondown | 이메일 (1,000명까지) | 무료 |
| OpenAI / Anthropic | LLM | ~$0.15~0.20/일 |

---

## 카테고리 태그 풀 (config.yaml SSOT)

```yaml
# config.yaml — 이것만 수정하면 전체 반영
categories:
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
```

프롬프트 주입 방식:
```python
categories_str = ", ".join(config["categories"])
prompt = template.replace("{categories_from_config}", categories_str)
```

---

## 데이터 모델

### papers 테이블

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | INTEGER PK | |
| `arxiv_id` | TEXT UNIQUE | |
| `title_en/ko` | TEXT | |
| `abstract_en/ko` | TEXT | |
| `ai_summary_en/ko` | TEXT | |
| `contributions_en/ko` | JsonType | list[str] |
| `one_liner_en/ko` | TEXT | |
| `authors` | JsonType | list[str] |
| `categories` | JsonType | list[str] |
| `upvotes` | INTEGER | |
| `github_repo` | TEXT | |
| `project_page` | TEXT | |
| `linked_models` | JsonType | list[str] |
| `published_at` | DATETIME | |
| `fetched_at` | DATETIME | DEFAULT NOW |
| `processed_at` | DATETIME | 구 translated_at |
| `published` | BOOLEAN | DEFAULT FALSE |
| `prompt_version` | TEXT | ex: "v1.0" |

### daily_papers

| 컬럼 | 타입 |
|---|---|
| `date` | DATE |
| `paper_id` | FK → papers.id |
| `rank` | INTEGER |
| `importance` | "hot" / "normal" |

### execution_logs

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `job_id` | TEXT | |
| `status` | TEXT | "success"/"failed"/"partial" |
| `papers_count` | INTEGER | |
| `api_cost` | **Float** | ← Integer 아님 주의 |
| `prompt_version` | TEXT | |
| `error_msg` | TEXT | |

---

## 핵심 알고리즘 요약

### Fetcher 흐름
```
1. KST 기준 오늘 날짜 계산
2. GET /api/daily_papers?date={today}
3. arxiv_id 목록 추출
4. asyncio.Semaphore(3) → 상세 API 병렬 호출
5. DB upsert (ON CONFLICT UPDATE)
6. processed_at 있는 논문 스킵
```

### Processor 흐름
```
입력: title_en, abstract_en, ai_summary_en
    ↓
process_with_fallback()
    ├─ 1차: GPT-4o → safe_parse_json()
    ├─ 2차: Claude 백업 → safe_parse_json()
    └─ 3차: 영문 fallback (번역 없이 원문)
출력: categories, one_liner, contributions, title/abstract/summary_ko
```

### Publisher 흐름
```
processed_at IS NOT NULL AND published = FALSE 조회
    ↓
Markdown 파일 생성 (website/content/daily/{date}.md)
    ↓
git add data/ website/content/ && git commit && git push
    ↓
published = TRUE, published_at 업데이트
    ↓
Discord 알림 → 이메일 발송
```

---

## 에러 처리 전략

| 시나리오 | 처리 방식 |
|---|---|
| HF API 429 | Retry-After 헤더 대기, 최대 3회 |
| HF API 다운 | 스킵 + execution_logs 기록 |
| LLM Rate Limit | Exponential backoff (1→2→4s) |
| LLM JSON 파싱 실패 | 정규식 추출 → 백업 LLM → 영문 fallback |
| LLM 전체 다운 | 영문 fallback, status="partial" |
| DB 잠금 | 30초 타임아웃, 3회 재시도 |
| 논문 없음 (휴일) | Graceful skip |
| 번역 품질 저하 | PROMPTS.md 버전 관리, 롤백 |

---

## 보안

| 항목 | 조치 |
|---|---|
| API 키 전체 | GitHub Secrets + `os.getenv()` |
| `data/hf_papers.db` | 논문 데이터만 → Git 추적 허용 |
| `.env` | `.gitignore` 필수 |
| 로그 | `sk-***MASKED***` 마스킹 |

---

## 성능 목표

| 지표 | 목표값 |
|---|---|
| 파이프라인 실행 (12편) | < 90초 |
| LLM API 비용 | < $0.20/일 |
| 웹사이트 TTFB | < 200ms |
| JSON 파싱 성공률 | > 99% |

---

## 확장 로드맵

| 단계 | 시기 | 핵심 기능 |
|---|---|---|
| MVP | 0주 | 수집 → 처리 → 게시 → 이메일 |
| v1.1 | 4주 | 필터 / RSS / 다크모드 / SEO / Actions Cache |
| v1.2 | 8주 | 검색 / 댓글 / 북마크 / 소셜공유 |
| v2.0 | 12주 | PostgreSQL 마이그레이션 / PDF 요약 / 주간 리포트 |
