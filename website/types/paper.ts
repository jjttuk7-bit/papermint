export interface Paper {
  id: number;
  arxiv_id: string;
  title_en: string;
  title_ko: string | null;
  abstract_en: string | null;
  abstract_ko: string | null;
  ai_summary_en: string | null;
  ai_summary_ko: string | null;
  contributions_en: string[] | null;
  contributions_ko: string[] | null;
  one_liner_en: string | null;
  one_liner_ko: string | null;
  authors: string[] | null;
  categories: string[] | null;
  upvotes: number;
  github_repo: string | null;
  project_page: string | null;
  linked_models: string[] | null;
  published_at: string | null;
  published: boolean;
}

export interface DailyPaperRow {
  rank: number | null;
  importance: 'hot' | 'normal';
  paper: Paper;
}
