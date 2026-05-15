import Link from 'next/link';
import CategoryBadge from './CategoryBadge';
import type { DailyPaperRow } from '@/types/paper';

export default function PaperCard({ dailyPaper }: { dailyPaper: DailyPaperRow }) {
  const { rank, importance, paper } = dailyPaper;
  const title = paper.title_ko || paper.title_en;
  const oneLiner = paper.one_liner_ko || paper.one_liner_en;
  const authors = (paper.authors ?? []).slice(0, 3);
  const hasMoreAuthors = (paper.authors?.length ?? 0) > 3;

  return (
    <article
      className={`bg-white rounded-xl border transition-all hover:shadow-md group ${
        importance === 'hot'
          ? 'border-orange-200 hover:border-orange-300'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="p-5">
        {/* 상단: 순위 + HOT + 카테고리 + upvotes */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          {rank != null && (
            <span className="text-xs font-mono text-slate-400 shrink-0">#{rank}</span>
          )}
          {importance === 'hot' && (
            <span className="text-xs font-semibold text-orange-500 shrink-0">🔥 HOT</span>
          )}
          <div className="flex flex-wrap gap-1.5">
            {(paper.categories ?? []).map((c) => (
              <CategoryBadge key={c} category={c} />
            ))}
          </div>
          <span className="ml-auto text-xs text-slate-400 shrink-0 font-mono">▲ {paper.upvotes}</span>
        </div>

        {/* 제목 */}
        <Link href={`/papers/${paper.arxiv_id}`}>
          <h2 className="font-semibold text-slate-900 group-hover:text-indigo-600 leading-snug mb-1 transition-colors">
            {title}
          </h2>
        </Link>
        {paper.title_ko && (
          <p className="text-xs text-slate-400 mb-2.5 line-clamp-1">{paper.title_en}</p>
        )}

        {/* 한 줄 요약 */}
        {oneLiner && (
          <p className="text-sm text-slate-600 leading-relaxed mb-3.5 line-clamp-2">{oneLiner}</p>
        )}

        {/* 하단: 저자 + 링크 */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {authors.length > 0 && (
            <span className="truncate flex-1">
              {authors.join(', ')}{hasMoreAuthors ? ' 외' : ''}
            </span>
          )}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://arxiv.org/abs/${paper.arxiv_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-500 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              arXiv ↗
            </a>
            {paper.github_repo && (
              <a
                href={paper.github_repo}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-indigo-500 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                GitHub ↗
              </a>
            )}
            {paper.project_page && (
              <a
                href={paper.project_page}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-indigo-500 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Project ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
