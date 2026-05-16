# SESSION.md
<!-- 매 세션 종료 시 업데이트. Claude Code가 세션 시작 시 가장 먼저 읽는 상태 파일. -->

## 현재 상태

| 항목 | 내용 |
|---|---|
| **최종 업데이트** | 2026-05-16 (5차) |
| **현재 단계** | MVP 완성 + 운영 중 |
| **Vercel URL** | papermint.vercel.app |
| **GitHub** | github.com/jjttuk7-bit/papermint |

---

## 완료된 작업

### 에이전트 (Python)
- `database/schema.sql`, `database/models.py`, `database/init_db.py`
- `database/migrate_v1.1.py` — methodology_ko/results_ko/limitations_ko 컬럼 추가
- `config.yaml` — prompt_version: v1.1
- `agent/fetcher.py` — asyncio Semaphore(3), 429/5xx/400 재시도
- `agent/prompts/v1.0_unified.txt`, `v1.1_unified.txt`
- `agent/processor.py` — safe_parse_json, GPT-4o→Claude→fallback
- `agent/notifier.py` — Discord/Slack/Buttondown
- `agent/publisher.py` — DB upsert, Markdown 생성, git staging
- `agent/main.py` — CLI 진입점, --dry-run, --reprocess, --date

### 인프라
- `.github/workflows/daily-papers.yml` — KST 09:00 자동 실행, migrate_v1.1 스텝 포함
- `.env.example`, `.gitignore`
- `requirements.txt`

### SEO 기본 세팅
- `website/app/sitemap.ts` — 홈/날짜/논문 URL 전체 sitemap.xml 자동 생성
- `website/app/robots.ts` — robots.txt + sitemap 경로 안내
- `website/app/layout.tsx` — metadataBase, title template, OG/Twitter 카드, keywords 추가
- `website/app/[date]/page.tsx` — 날짜별 description + OG + canonical 추가
- `website/app/papers/[id]/page.tsx` — 논문별 OG article 태그 + JSON-LD (ScholarlyArticle) 추가

### SNS 자동 게시
- `agent/notifier.py` — `notify_papers_twitter()` 추가: 논문 rank 순으로 Twitter에 1편씩 트윗
- `agent/publisher.py` — 게시 성공 후 `notify_papers_twitter()` 호출
- `requirements.txt` — `tweepy>=4.14` 추가
- `.github/workflows/daily-papers.yml` — Twitter 시크릿 4개 env 추가
- `.env.example` — Twitter 키 항목 추가
- 트윗 형식: 🔥(hot)/📄(normal) + 제목(한국어) + 한줄요약 + 해시태그 + 논문 링크

### 버그픽스
- `agent/fetcher.py` — `get_yesterday_utc()` 추가: HF API 조회용 UTC 어제 날짜
- `agent/main.py` — `_resolve_date()` → `(db_date, hf_date)` 튜플 반환으로 변경
  - 자동 실행: db_date=KST 오늘, hf_date=UTC 어제 (분리)
  - 수동 실행(`--date` / `FETCH_DATE`): 두 날짜 동일 (기존 동작 유지)
  - 배경: HF API는 UTC 기준이며 UTC 00:00(=KST 09:00)에는 당일 데이터 미완성 → 전날 완성 데이터 조회 필요

### 웹사이트 (Next.js 14 + Vercel)
- `website/next.config.mjs` — SSR, serverComponentsExternalPackages
- `website/lib/db.ts` — better-sqlite3 빌드 타임 쿼리
- `website/types/paper.ts` — methodology/results/limitations 포함
- `website/components/` — Header, PaperCard, PapersView, DateArchive, SearchBar, CategoryBadge, GoogleAnalytics
- `website/app/` — layout, page, [date]/page, papers/[id]/page, search/page
- Google Analytics G-M3WGWKW4Z2 연동

---

## 프롬프트 버전

| 버전 | 추가 필드 | 상태 |
|---|---|---|
| v1.0 | 기본 번역 + 분류 + 기여 + 한 줄 요약 | 구버전 |
| v1.1 | + 방법론, 핵심 결과, 한계점 | 구버전 |
| v1.2 | 번역 품질 개선: 금지 패턴 + 자연스러운 번역 원칙 + temperature 0.5 + max_tokens 2500 | ✅ 현재 사용 |

---

## 알려진 이슈 / 메모

- `website/data/hf_papers.db` Git 커밋으로 지속성 유지 (MVP 전략)
- better-sqlite3는 Vercel Lambda 런타임 비호환 → 빌드 타임에만 DB 접근 (정적 빌드)
- 카테고리 필터는 클라이언트 사이드 (PapersView.tsx)
- `/search` 페이지만 Dynamic(ƒ) — 나머지 전부 Static
- 2026-05-16 전환 과도기: 5/15·5/16 동일 논문 표시 (HF May15 UTC 데이터 양쪽에 저장). 5/17부터 정상화.

---

## 다음 세션 할 일

1. 방문자 통계 대시보드 (`/stats` 페이지) — DB 기반
2. Vercel Analytics 연동 (`@vercel/analytics`)
3. RSS 피드 (`/api/feed.xml`)
4. 이전 날짜 논문 재처리 자동화 스크립트
5. 채용 광고 / 스폰서십 섹션 준비
