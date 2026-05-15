import path from 'path';
import type { Paper, DailyPaperRow } from '@/types/paper';

const DB_PATH = path.join(process.cwd(), 'data', 'hf_papers.db');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDb(): any | null {
  try {
    // lazy require: 네이티브 모듈 로드 실패 시 null 반환하여 빌드 중단 방지
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3');
    return new Database(DB_PATH, { readonly: true });
  } catch {
    return null;
  }
}

function parseJson<T>(value: unknown): T | null {
  if (!value || typeof value !== 'string') return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function parsePaper(row: Record<string, unknown>): Paper {
  return {
    id: row.id as number,
    arxiv_id: row.arxiv_id as string,
    title_en: row.title_en as string,
    title_ko: (row.title_ko as string) ?? null,
    abstract_en: (row.abstract_en as string) ?? null,
    abstract_ko: (row.abstract_ko as string) ?? null,
    ai_summary_en: (row.ai_summary_en as string) ?? null,
    ai_summary_ko: (row.ai_summary_ko as string) ?? null,
    contributions_en: parseJson<string[]>(row.contributions_en),
    contributions_ko: parseJson<string[]>(row.contributions_ko),
    one_liner_en: (row.one_liner_en as string) ?? null,
    one_liner_ko: (row.one_liner_ko as string) ?? null,
    authors: parseJson<string[]>(row.authors),
    categories: parseJson<string[]>(row.categories),
    upvotes: (row.upvotes as number) ?? 0,
    github_repo: (row.github_repo as string) ?? null,
    project_page: (row.project_page as string) ?? null,
    linked_models: parseJson<string[]>(row.linked_models),
    published_at: (row.published_at as string) ?? null,
    published: Boolean(row.published),
  };
}

export function getAvailableDates(): string[] {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = db
      .prepare('SELECT DISTINCT date FROM daily_papers ORDER BY date DESC')
      .all() as { date: string }[];
    return rows.map((r) => r.date);
  } finally {
    db.close();
  }
}

export function getPapersForDate(date: string): DailyPaperRow[] {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = db
      .prepare(
        `SELECT dp.rank, dp.importance, p.*
         FROM daily_papers dp
         JOIN papers p ON dp.paper_id = p.id
         WHERE dp.date = ? AND p.published = 1
         ORDER BY COALESCE(dp.rank, 999) ASC`
      )
      .all(date) as Record<string, unknown>[];
    return rows.map((row) => ({
      rank: (row.rank as number) ?? null,
      importance: (row.importance as 'hot' | 'normal') ?? 'normal',
      paper: parsePaper(row),
    }));
  } finally {
    db.close();
  }
}

export function getPaperByArxivId(arxivId: string): Paper | null {
  const db = getDb();
  if (!db) return null;
  try {
    const row = db
      .prepare('SELECT * FROM papers WHERE arxiv_id = ?')
      .get(arxivId) as Record<string, unknown> | undefined;
    return row ? parsePaper(row) : null;
  } finally {
    db.close();
  }
}

export function getAllArxivIds(): string[] {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = db
      .prepare('SELECT arxiv_id FROM papers WHERE published = 1')
      .all() as { arxiv_id: string }[];
    return rows.map((r) => r.arxiv_id);
  } finally {
    db.close();
  }
}
