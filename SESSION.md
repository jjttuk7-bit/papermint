# SESSION.md
<!-- 매 세션 종료 시 업데이트. Claude Code가 세션 시작 시 가장 먼저 읽는 상태 파일. -->

## 현재 상태

| 항목 | 내용 |
|---|---|
| **최종 업데이트** | 2026-05-15 |
| **현재 단계** | 로컬 테스트 완료 — GitHub 푸시 준비 |
| **다음 작업** | git init → GitHub 리포 생성 → 첫 push |

---

## 완료된 작업

### 에이전트 (Python)
- `database/schema.sql`, `database/models.py`, `database/init_db.py`
- `config.yaml`, `requirements.txt`
- `agent/fetcher.py`, `agent/processor.py`, `agent/notifier.py`
- `agent/publisher.py`, `agent/main.py`
- `agent/prompts/v1_unified.txt`

### 인프라
- `.github/workflows/daily-papers.yml`
- `.env.example`, `.gitignore`

### 웹사이트 (Next.js 14)
- `website/package.json` (better-sqlite3 ^12.0.0 — Node 24 지원)
- `website/next.config.mjs` (output: export, serverComponentsExternalPackages)
- `website/lib/db.ts`, `website/types/paper.ts`
- `website/components/` — CategoryBadge, Header, PaperCard
- `website/app/` — layout, page, [date]/page, papers/[id]/page

---

## 로컬 테스트 결과

| 항목 | 결과 |
|---|---|
| `python database/init_db.py` | ✅ DB 생성 성공 |
| `python agent/main.py --dry-run` | ✅ HF API 47편 수집, 파이프라인 정상 |
| `npm install` | ✅ VS Build Tools 설치 후 성공 |
| `npm run build` (데이터 있을 때) | ✅ 6개 페이지 빌드 성공 |
| `npm run build` (빈 DB) | ❌ Next.js 14 버그 — 데이터 있으면 문제없음 |

---

## 수정 사항 (이번 세션)

- `agent/main.py`: sys.path 주입 (`python agent/main.py` 실행 지원)
- `agent/main.py`, `agent/publisher.py`, `database/models.py`: `datetime.utcnow()` → `datetime.now(timezone.utc)`
- `agent/main.py`: 로그 포맷 `—` → `-` (Windows cp949 인코딩 대응)
- `website/next.config.ts` → `next.config.mjs` (Next.js 14는 .ts 미지원)
- `website/package.json`: `better-sqlite3@^9.4` → `^12.0.0` (Node 24 prebuilt 지원)
- `website/next.config.mjs`: `serverComponentsExternalPackages: ['better-sqlite3']` 추가
- `website/app/[date]/page.tsx`, `papers/[id]/page.tsx`: `dynamicParams = false` 추가
- `website/lib/db.ts`: `import Database` → lazy `require` (빌드 안전성)

---

## 다음 세션 할 일

1. GitHub 리포 생성 (공개 or 비공개)
2. `git init && git remote add origin ...`
3. GitHub Secrets 설정: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `HF_TOKEN`, `DISCORD_WEBHOOK` 등
4. 첫 push → Actions 자동 실행 확인

---

## 알려진 제약사항

- **빈 DB에서 `npm run build` 실패**: Next.js 14 버그. GitHub Actions에서는 에이전트가 먼저 실행되므로 문제없음. 로컬 빌드는 `npm run dev` 사용 권장.
- **Windows 콘솔 한글 깨짐**: cp949 표시 문제. 로그 파일(UTF-8)은 정상.
