# Twitter/X 자동 게시 세팅 가이드

> 코드는 완성되어 있음. 아래 순서대로 계정/키 세팅만 하면 즉시 동작.

---

## 동작 방식

매일 논문 처리 완료 후 rank 순서대로 Twitter에 1편씩 자동 트윗.

**트윗 형식 예시**:
```
🔥 어텐션이 전부다

순수 어텐션 메커니즘 기반 트랜스포머를 제안하여 번역 최고 성능을 달성합니다.

#NLP #Efficiency #AI논문 #papermint

🔗 https://papermint-omega.vercel.app/papers/1706.03762
```

- 🔥 = HuggingFace 기준 "hot" 논문 / 📄 = 일반 논문
- 번역 실패(영문 fallback) 논문은 게시 제외
- 트윗 간 3초 간격 (Twitter API 레이트 리밋 대응)
- 시크릿 미설정 시 에러 없이 스킵 (기존 파이프라인 영향 없음)

---

## 세팅 순서

### 1단계. Twitter/X 개발자 계정 신청

1. `developer.twitter.com` 접속
2. 로그인 → "Sign up for Free Account"
3. 사용 목적 입력: "Automated posting of AI paper summaries for educational purposes"
4. Free 플랜으로 충분 (1,500 트윗/월, 실제 사용량 ~360트윗/월)

### 2단계. 앱 생성

1. Developer Portal → Projects & Apps → "Create App"
2. 앱 이름: `papermint-bot` (또는 원하는 이름)
3. **⚠️ 중요**: App permissions → **"Read and Write"** 로 변경
   - 기본값은 "Read only"라 트윗 게시 불가
   - Settings 탭 → App permissions → Edit → Read and Write 선택

### 3단계. API 키 발급

1. 앱 → "Keys and Tokens" 탭
2. 아래 4개 값을 모두 복사:

| 항목 | 환경변수명 |
|---|---|
| API Key | `TWITTER_API_KEY` |
| API Key Secret | `TWITTER_API_SECRET` |
| Access Token | `TWITTER_ACCESS_TOKEN` |
| Access Token Secret | `TWITTER_ACCESS_TOKEN_SECRET` |

> Access Token은 "Generate" 버튼으로 생성. **한 번만 표시**되므로 즉시 저장.

### 4단계. GitHub Secrets 등록

1. `github.com/jjttuk7-bit/papermint` → Settings
2. Secrets and variables → Actions → "New repository secret"
3. 위 4개를 각각 등록

### 5단계. (선택) 로컬 테스트

`.env` 파일에 키 추가 후:
```bash
python agent/main.py --date 2026-05-16 --dry-run
```
`--dry-run` 모드에서는 트윗이 실제로 발송되지 않음.

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 트윗이 안 올라감 | 시크릿 미등록 또는 잘못된 값 | GitHub Secrets 재확인 |
| `403 Forbidden` | App permissions가 Read only | developer.twitter.com에서 Read and Write로 변경 후 Access Token 재발급 |
| `401 Unauthorized` | Access Token 만료 또는 불일치 | Access Token 재발급 |
| 트윗 일부만 게시됨 | 개별 트윗 실패 (레이트 리밋 등) | 로그에서 `트윗 게시 실패` 메시지 확인 |

---

## 관련 코드 위치

| 역할 | 파일 | 함수 |
|---|---|---|
| 트윗 내용 생성 | `agent/notifier.py` | `_build_tweet()` |
| Twitter 게시 로직 | `agent/notifier.py` | `notify_papers_twitter()` |
| 호출 지점 | `agent/publisher.py` | `publish()` 내 성공 알림 이후 |
