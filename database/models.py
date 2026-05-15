import json
import os
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import (
    Boolean, CheckConstraint, Column, DateTime, Float,
    ForeignKey, Integer, String, Text, UniqueConstraint, create_engine,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy.types import TypeDecorator

_DB_PATH = Path(os.getenv("DB_PATH", "website/data/hf_papers.db"))


def get_engine():
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return create_engine(f"sqlite:///{_DB_PATH}", connect_args={"timeout": 30})


def init_db():
    engine = get_engine()
    Base.metadata.create_all(engine)
    return engine


@contextmanager
def get_session():
    engine = get_engine()
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    session = Session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

Base = declarative_base()


class JsonType(TypeDecorator):
    """SQLite TEXT 컬럼에 Python list/dict를 자동으로 JSON 직렬화/역직렬화한다."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value, ensure_ascii=False)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        return value


class Paper(Base):
    __tablename__ = 'papers'

    id = Column(Integer, primary_key=True)
    arxiv_id = Column(String, unique=True, nullable=False)
    title_en = Column(Text, nullable=False)
    title_ko = Column(Text)
    abstract_en = Column(Text)
    abstract_ko = Column(Text)
    ai_summary_en = Column(Text)
    ai_summary_ko = Column(Text)
    contributions_en = Column(JsonType)
    contributions_ko = Column(JsonType)
    one_liner_en = Column(Text)
    one_liner_ko = Column(Text)
    authors = Column(JsonType)
    categories = Column(JsonType)
    upvotes = Column(Integer, default=0)
    github_repo = Column(String)
    project_page = Column(String)
    linked_models = Column(JsonType)
    published_at = Column(DateTime)
    fetched_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    processed_at = Column(DateTime)
    published = Column(Boolean, default=False)
    prompt_version = Column(String)

    daily_entries = relationship("DailyPaper", back_populates="paper")


class DailyPaper(Base):
    __tablename__ = 'daily_papers'

    id = Column(Integer, primary_key=True)
    date = Column(String, nullable=False)  # YYYY-MM-DD
    paper_id = Column(Integer, ForeignKey('papers.id'), nullable=False)
    rank = Column(Integer)
    importance = Column(String)

    paper = relationship("Paper", back_populates="daily_entries")

    __table_args__ = (
        CheckConstraint("importance IN ('hot', 'normal')"),
        UniqueConstraint('date', 'paper_id'),
    )


class ExecutionLog(Base):
    __tablename__ = 'execution_logs'

    id = Column(Integer, primary_key=True)
    job_id = Column(String, nullable=False)
    started_at = Column(DateTime)
    ended_at = Column(DateTime)
    status = Column(String)
    papers_count = Column(Integer)
    api_cost = Column(Float)
    prompt_version = Column(String)
    error_msg = Column(Text)

    __table_args__ = (
        CheckConstraint("status IN ('success', 'failed', 'partial')"),
    )
