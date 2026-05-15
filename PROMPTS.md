# PROMPTS.md — LLM 프롬프트 설계 및 버전 관리

## 관리 원칙

프롬프트는 코드와 동급이다. 변경할 때마다 반드시 아래 규칙을 따른다.

1. **버전 증가**: 수정 시 version 번호 증가 (v1.0 → v1.1 → v2.0)
2. **변경 기록**: 변경 이유, 기대 효과, 실제 결과를 이 파일에 기록
3. **아카이브**: 이전 버전을 `agent/prompts/archive/` 디렉토리에 보관
4. **실행 추적**: `execution_logs.prompt_version`, `papers.prompt_version`에 사용 버전 기록
5. **롤백 절차**: 품질 저하 감지 시 `config.yaml`의 `prompt_version` 값만 변경하면 즉시 롤백

---

## 버전 이력

| 버전 | 날짜 | 변경 내용 | 상태 |
|---|---|---|---|
| v1.0 | 2026-05-15 | 초기 버전: 분석+번역 통합 프롬프트 | ✅ 현재 사용 |

---

## v1.0 — Unified Processor (분석+번역 통합)

### 메타 정보

| 항목 | 값 |
|---|---|
| 버전 | 1.0 |
| 작성일 | 2026-05-15 |
| 대상 모델 | `gpt-4o` (주력), `claude-3-5-sonnet-20241022` (백업) |
| 예상 입력 토큰 | ~800 tokens |
| 예상 출력 토큰 | ~600 tokens |
| 논문당 예상 비용 | ~$0.012 (GPT-4o 기준) |
| 설계 목적 | Analyzer + Translator를 단일 호출로 통합하여 비용 절반, 속도 2배 |

### 변경 이유

초기 설계에서는 분석(Analyzer)과 번역(Translator)을 별도 LLM 호출로 처리했다.
이를 단일 호출로 통합하면:
- LLM API 호출 횟수: 논문당 2회 → 1회
- 컨텍스트 공유: 분석 결과를 번역 시 즉시 활용 가능 (일관성 향상)
- 비용: 약 40% 절감 (중복 입력 토큰 제거)

### 시스템 프롬프트

```
당신은 AI/ML 연구 논문 분석 및 번역 전문가입니다.

주어진 논문 정보를 분석하고 한국어로 번역하여 JSON 형식으로만 응답하세요.
JSON 외의 텍스트(인사말, 설명, 마크다운 등)는 절대 포함하지 마세요.
```

### 유저 프롬프트 템플릿

```
다음 논문을 분석하고 번역하세요.

[논문 정보]
제목: {title_en}
초록: {abstract_en}
AI 요약: {ai_summary_en}

[사용 가능한 카테고리 태그]
{categories_from_config}

[출력 형식 - 반드시 순수 JSON만 출력]
{
  "categories": ["태그1", "태그2"],
  "one_liner_en": "논문의 핵심 기여를 1문장으로 요약 (영문)",
  "one_liner_ko": "논문의 핵심 기여를 1문장으로 요약 (한글, 40~80자)",
  "contributions_en": [
    "핵심 기여 1 (영문)",
    "핵심 기여 2 (영문)",
    "핵심 기여 3 (영문)"
  ],
  "contributions_ko": [
    "핵심 기여 1 (한글)",
    "핵심 기여 2 (한글)",
    "핵심 기여 3 (한글)"
  ],
  "title_ko": "한글 제목",
  "abstract_ko": "한글 초록",
  "ai_summary_ko": "한글 AI 요약"
}

[번역 및 작성 규칙]
1. categories: 위 태그 목록에서만 선택, 1~3개
2. one_liner: 논문이 "무엇을 제안하여 어떤 문제를 해결하는지" 명확히 서술
3. contributions: 3~5개, 구체적이고 기술적으로 작성
4. 학술 용어는 첫 등장 시 원문 병기: "어텐션 메커니즘 (Attention mechanism)"
5. 고유명사/알고리즘명은 원문 유지: "LoRA", "RLHF", "Transformer"
6. 수식은 LaTeX 형태 유지: $E = mc^2$
7. 자연스러운 한국어, 전문가 수준 정확성
8. 문체: '~습니다' 체 사용
```

### 품질 기준

| 항목 | 기준 | 측정 방법 |
|---|---|---|
| JSON 파싱 성공률 | > 99% | execution_logs 통계 |
| categories 정확도 | 지정 태그 풀에서만 선택 | 코드 레벨 검증 |
| one_liner_ko 길이 | 40~80자 | 코드 레벨 검증 |
| contributions 개수 | 3~5개 | 코드 레벨 검증 |
| 학술 용어 병기 | 첫 등장 시 원문 포함 | 샘플링 수동 검토 |
| 번역 자연스러움 | 한국어 원어민 기준 어색함 없음 | 주간 샘플링 검토 |

### 출력 예시 (Few-Shot)

**입력**:
```
제목: Attention Is All You Need
초록: We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely...
AI 요약: This paper introduces the Transformer architecture...
```

**기대 출력**:
```json
{
  "categories": ["NLP", "Efficiency"],
  "one_liner_en": "This paper proposes the Transformer architecture based solely on attention mechanisms, eliminating recurrence and convolutions to achieve state-of-the-art translation quality.",
  "one_liner_ko": "순수 어텐션 메커니즘 기반의 트랜스포머 아키텍처를 제안하여 반복 구조와 합성곱 없이 최고 수준의 번역 품질을 달성합니다.",
  "contributions_en": [
    "Introduced the Transformer architecture based entirely on self-attention mechanisms",
    "Eliminated sequential recurrence, enabling full parallelization of training",
    "Achieved state-of-the-art BLEU scores on WMT 2014 English-to-German and English-to-French tasks"
  ],
  "contributions_ko": [
    "셀프 어텐션 (Self-Attention) 메커니즘만으로 구성된 트랜스포머 아키텍처를 제안합니다",
    "순차적 반복 구조를 제거하여 학습의 완전한 병렬화를 가능하게 합니다",
    "WMT 2014 영어-독일어 및 영어-프랑스어 번역에서 최고 BLEU 점수를 달성합니다"
  ],
  "title_ko": "어텐션이 전부다",
  "abstract_ko": "우리는 어텐션 메커니즘 (Attention mechanism)만을 기반으로 한 새로운 단순 네트워크 아키텍처인 트랜스포머 (Transformer)를 제안합니다. 순환 구조와 합성곱 (Convolution)을 완전히 제거하였으며...",
  "ai_summary_ko": "이 논문은 트랜스포머 아키텍처를 소개합니다..."
}
```

---

## 품질 저하 감지 기준

다음 중 하나라도 해당하면 프롬프트 점검 및 버전 업을 검토한다.

| 감지 지표 | 임계값 | 조치 |
|---|---|---|
| JSON 파싱 실패율 | > 1% (3일 이상 연속) | 프롬프트 시스템 메시지 강화 |
| categories 범위 이탈 | > 5% | categories 규칙 강조 추가 |
| one_liner_ko 길이 이탈 | > 10% | 길이 규칙 예시 추가 |
| contributions 개수 이탈 | > 10% | 개수 규칙 강조 및 예시 추가 |
| 번역 품질 민원 | 1건 이상 | 즉시 수동 샘플 검토 |

---

## 롤백 절차

품질 저하 감지 시 즉시 이전 버전으로 롤백:

```yaml
# config.yaml 수정 (단 1줄)
prompt_version: "v0.9"  # 이전 안정 버전으로 복구
```

```python
# agent/processor.py — 버전별 프롬프트 자동 선택
def load_prompt(version: str) -> str:
    prompt_path = f"agent/prompts/{version}_unified.txt"
    if not os.path.exists(prompt_path):
        # 아카이브에서 찾기
        prompt_path = f"agent/prompts/archive/{version}_unified.txt"
    with open(prompt_path) as f:
        return f.read()
```

---

## 향후 프롬프트 개선 아이디어 (백로그)

| 아이디어 | 예상 효과 | 우선순위 |
|---|---|---|
| 논문 분야별 전문 용어 사전 주입 | 번역 일관성 향상 | P2 |
| few-shot 예시 3~5개 추가 | JSON 파싱 성공률 향상 | P1 |
| 번역 톤 옵션 (학술/대중) | 독자층 확대 | P3 |
| 초록 길이 제한 옵션 | 토큰 비용 절감 | P2 |
| 관련 논문 키워드 추출 | 유사 논문 추천 기능 기반 | P3 |
