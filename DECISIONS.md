# DECISIONS.md
<!-- 설계 결정을 내릴 때마다 기록. "왜 이렇게 했지?"를 Claude에게 다시 설명하지 않기 위한 파일. -->

## 기록 형식

```
## YYYY-MM-DD | 결정 제목
- **결정**: 무엇을 선택했는가
- **이유**: 왜 이것을 선택했는가
- **대안**: 고려했던 다른 선택지
- **번복 조건**: 어떤 상황이면 바꿀 수 있는가
```

---

## 2026-05-15 | Processor 통합 (LLM 1회 호출)

- **결정**: Analyzer + Translator를 단일 LLM 호출 `Processor`로 통합
- **이유**: 분리 시 논문당 LLM 2회 호출 → 비용 2배, 컨텍스트 단절로 번역 일관성 저하
- **대안**: 분리 호출 (분석 결과를 번역 프롬프트에 넘기는 방식)
- **번복 조건**: 통합 프롬프트 품질이 분리 방식보다 현저히 낮을 경우. 인터페이스(`process(paper) → ProcessedPaper`)는 유지한 채 내부만 분리.

---

## 2026-05-15 | SQLite DB Git 커밋 허용

- **결정**: `data/hf_papers.db`를 `.gitignore` 제외, Git 추적 대상에 포함
- **이유**: GitHub Actions는 매 실행 클린 환경에서 시작. DB를 커밋하지 않으면 누적 데이터가 매일 초기화됨
- **대안 A**: GitHub Actions Cache → 캐시 만료 시 데이터 소실 위험
- **대안 B**: PostgreSQL (Supabase) → MVP 단계에서 외부 서비스 의존성 증가
- **번복 조건**: v1.1에서 Actions Cache로 전환. DB 파일이 10MB 초과하거나 Git push 속도 저하 시.

---

## 2026-05-15 | JsonType TypeDecorator 사용

- **결정**: `authors`, `categories`, `contributions_*`, `linked_models` 필드에 SQLAlchemy `JsonType TypeDecorator` 적용
- **이유**: 수동 `json.dumps/loads` 호출 시 누락 위험. TypeDecorator로 ORM 레벨 자동 처리.
- **대안**: 각 저장/조회 시점에 수동 직렬화
- **번복 조건**: PostgreSQL 마이그레이션 시 native JSON 타입으로 교체

---

## 2026-05-15 | 카테고리 태그 config.yaml SSOT

- **결정**: 카테고리 태그 풀을 `config.yaml`에만 정의하고 코드·프롬프트에는 하드코딩 금지
- **이유**: 태그 추가/수정 시 코드, 프롬프트, UI 3곳을 동시에 수정해야 하는 문제 방지
- **대안**: 프롬프트 파일에 직접 명시
- **번복 조건**: 없음 (단일 진실 공급원 원칙은 유지)

---

## 2026-05-15 | safe_parse_json 3단계 파싱

- **결정**: LLM JSON 파싱을 직접파싱 → 코드블록 추출 → 중괄호 추출 3단계로 처리
- **이유**: LLM이 JSON 앞뒤에 설명 텍스트를 붙이는 경우가 빈번. 단순 `json.loads()` 호출 시 파싱 실패율 높음
- **대안**: 프롬프트에서 JSON만 출력하도록 강제 (100% 보장 불가)
- **번복 조건**: 없음 (방어적 파싱은 항상 유리)
