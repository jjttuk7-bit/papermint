import path from 'path';
import type { Paper, DailyPaperRow } from '@/types/paper';

const DB_PATH = path.join(process.cwd(), 'data', 'hf_papers.db');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDb(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3');
    return new Database(DB_PATH, { readonly: true });
  } catch {
    return null;
  }
}

function parseJson<T>(value: unknown): T | null {
  if (!value || typeof value !== 'string') return null;
  try { return JSON.parse(value) as T; } catch { return null; }
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
    return (db.prepare('SELECT DISTINCT date FROM daily_papers ORDER BY date DESC').all() as { date: string }[])
      .map((r) => r.date);
  } finally { db.close(); }
}

export function getMonthlyDates(): { month: string; label: string; dates: string[] }[] {
  const dates = getAvailableDates();
  const map = new Map<string, string[]>();
  for (const d of dates) {
    const m = d.slice(0, 7);
    if (!map.has(m)) map.set(m, []);
    map.get(m)!.push(d);
  }
  return Array.from(map.entries()).map(([month, ds]) => {
    const [y, m] = month.split('-');
    return { month, label: `${y}년 ${parseInt(m)}월`, dates: ds };
  });
}

export function getPapersForDate(date: string, category?: string): DailyPaperRow[] {
  const db = getDb();
  if (!db) return [];
  try {
    const sql = `
      SELECT dp.rank, dp.importance, p.*
      FROM daily_papers dp
      JOIN papers p ON dp.paper_id = p.id
      WHERE dp.date = ? AND p.published = 1
      ${category ? "AND p.categories LIKE ?" : ""}
      ORDER BY COALESCE(dp.rank, 999) ASC
    `;
    const params = category ? [date, `%"${category}"%`] : [date];
    return (db.prepare(sql).all(...params) as Record<string, unknown>[]).map((row) => ({
      rank: (row.rank as number) ?? null,
      importance: (row.importance as 'hot' | 'normal') ?? 'normal',
      paper: parsePaper(row),
    }));
  } finally { db.close(); }
}

export function getPaperByArxivId(arxivId: string): Paper | null {
  const db = getDb();
  if (!db) return null;
  try {
    const row = db.prepare('SELECT * FROM papers WHERE arxiv_id = ?').get(arxivId) as Record<string, unknown> | undefined;
    return row ? parsePaper(row) : null;
  } finally { db.close(); }
}

export function getAllArxivIds(): string[] {
  const db = getDb();
  if (!db) return [];
  try {
    return (db.prepare('SELECT arxiv_id FROM papers WHERE published = 1').all() as { arxiv_id: string }[])
      .map((r) => r.arxiv_id);
  } finally { db.close(); }
}

export function searchPapers(query: string, limit = 30): Paper[] {
  const db = getDb();
  if (!db) return [];
  const like = `%${query}%`;
  try {
    return (db.prepare(`
      SELECT * FROM papers
      WHERE published = 1 AND (
        title_ko LIKE ? OR title_en LIKE ? OR
        abstract_ko LIKE ? OR one_liner_ko LIKE ?
      )
      ORDER BY upvotes DESC, published_at DESC
      LIMIT ?
    `).all(like, like, like, like, limit) as Record<string, unknown>[]).map(parsePaper);
  } finally { db.close(); }
}

export function getStats(): { total: number; today: number; latestDate: string | null } {
  const db = getDb();
  if (!db) return { total: 0, today: 0, latestDate: null };
  try {
    const total = (db.prepare('SELECT COUNT(*) as n FROM papers WHERE published = 1').get() as { n: number }).n;
    const latestDate = getAvailableDates()[0] ?? null;
    const today = latestDate
      ? (db.prepare('SELECT COUNT(*) as n FROM daily_papers WHERE date = ?').get(latestDate) as { n: number }).n
      : 0;
    return { total, today, latestDate };
  } finally { db.close(); }
}
