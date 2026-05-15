-- papers 테이블
CREATE TABLE papers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    arxiv_id TEXT UNIQUE NOT NULL,
    title_en TEXT NOT NULL,
    title_ko TEXT,
    abstract_en TEXT,
    abstract_ko TEXT,
    ai_summary_en TEXT,
    ai_summary_ko TEXT,
    contributions_en TEXT,  -- JSON array (json.dumps 직렬화)
    contributions_ko TEXT,  -- JSON array (json.dumps 직렬화)
    one_liner_en TEXT,
    one_liner_ko TEXT,
    authors TEXT,           -- JSON array (json.dumps 직렬화)
    categories TEXT,        -- JSON array (json.dumps 직렬화)
    upvotes INTEGER DEFAULT 0,
    github_repo TEXT,
    project_page TEXT,
    linked_models TEXT,     -- JSON array (json.dumps 직렬화)
    published_at DATETIME,
    fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,  -- 분석+번역 완료 시각 (구 translated_at)
    published BOOLEAN DEFAULT FALSE,
    prompt_version TEXT,    -- 처리에 사용된 프롬프트 버전 (ex: "v1.1")
    methodology_ko TEXT,    -- v1.1: 방법론 요약 (3~5문장)
    results_ko TEXT,        -- v1.1: 핵심 실험 결과 요약
    limitations_ko TEXT     -- v1.1: 한계점 1~3가지
);

CREATE INDEX idx_papers_arxiv ON papers(arxiv_id);
CREATE INDEX idx_papers_published ON papers(published);
CREATE INDEX idx_papers_fetched ON papers(fetched_at);
CREATE INDEX idx_papers_processed ON papers(processed_at);

-- daily_papers 테이블
CREATE TABLE daily_papers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    paper_id INTEGER NOT NULL REFERENCES papers(id),
    rank INTEGER,
    importance TEXT CHECK(importance IN ('hot', 'normal')),
    UNIQUE(date, paper_id)
);

CREATE INDEX idx_daily_date ON daily_papers(date);

-- execution_logs 테이블
CREATE TABLE execution_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    started_at DATETIME,
    ended_at DATETIME,
    status TEXT CHECK(status IN ('success', 'failed', 'partial')),
    papers_count INTEGER,
    api_cost REAL,          -- REAL 타입 (소수점 비용 저장)
    prompt_version TEXT,
    error_msg TEXT
);

CREATE INDEX idx_logs_job ON execution_logs(job_id);
CREATE INDEX idx_logs_date ON execution_logs(started_at);
