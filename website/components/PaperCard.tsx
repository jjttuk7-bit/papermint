import Link from 'next/link';
import CategoryBadge from './CategoryBadge';
import type { DailyPaperRow } from '@/types/paper';

export default function PaperCard({ dailyPaper }: { dailyPaper: DailyPaperRow }) {
  const { rank, importance, paper } = dailyPaper;
  const title = paper.title_ko || paper.title_en;
  const oneLiner = paper.one_liner_ko || paper.one_liner_en;
  const authors = paper.authors?.slice(0, 3) ?? [];
  const hasMoreAuthors = (paper.authors?.length ?? 0) > 3;

  return (
    <article className={`bg-white rounded-lg border p-5 hover:shadow-sm transition-shadow ${
      importance === 'hot' ? 'border-orange-200' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* 순위 + 카테고리 */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {rank != null && (
              <span className="text-xs font-mono text-gray-400">#{rank}</span>
            )}
            {importance === 'hot' && (
              <span className="text-xs font-medium text-orange-600">🔥 HOT</span>
            )}
            {(paper.categories ?? []).map((c) => (
              <CategoryBadge key={c} category={c} />
            ))}
          </div>

          {/* 제목 */}
          <Link href={`/papers/${paper.arxiv_id}/`}>
            <h2 className="text-base font-semibold text-gray-900 hover:text-blue-600 leading-snug mb-1">
              {title}
            </h2>
            {paper.title_ko && (
              <p className="text-xs text-gray-400 mb-2">{paper.title_en}</p>
            )}
          </Link>

          {/* 한 줄 요약 */}
          {oneLiner && (
            <p className="text-sm text-gray-600 leading-relaxed mb-3">{oneLiner}</p>
          )}

          {/* 저자 + 링크 + upvotes */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
            {authors.length > 0 && (
              <span>
                {authors.join(', ')}{hasMoreAuthors ? ' 외' : ''}
              </span>
            )}
            <span>▲ {paper.upvotes}</span>
            <a
              href={`https://arxiv.org/abs/${paper.arxiv_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-500"
            >
              arXiv
            </a>
            {paper.github_repo && (
              <a
                href={paper.github_repo}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-500"
              >
                GitHub
              </a>
            )}
            {paper.project_page && (
              <a
                href={paper.project_page}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-500"
              >
                Project
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
