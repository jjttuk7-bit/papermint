import Link from 'next/link';
import CategoryBadge from './CategoryBadge';
import type { DailyPaperRow } from '@/types/paper';

const CLASSIC_SLOT_LABEL: Record<string, string> = {
  foundation: '🏛️ Foundation',
  vision: '🖼️ Vision',
  language: '💬 Language',
};

export default function PaperCard({ dailyPaper }: { dailyPaper: DailyPaperRow }) {
  const { rank, importance, paper } = dailyPaper;
  const isHot = importance === 'hot';
  const isClassic = paper.is_classic;
  const slotLabel = isClassic && paper.classic_slot ? CLASSIC_SLOT_LABEL[paper.classic_slot] : null;
  const title = paper.title_ko || paper.title_en;
  const oneLiner = paper.one_liner_ko || paper.one_liner_en;
  const contributions = paper.contributions_ko || paper.contributions_en || [];
  const authors = (paper.authors ?? []).slice(0, 3);
  const hasMoreAuthors = (paper.authors?.length ?? 0) > 3;

  return (
    <article
      className={`bg-white rounded-2xl border transition-all duration-200 hover:shadow-lg group overflow-hidden ${
        isHot
          ? 'border-orange-200 hover:border-orange-300'
          : isClassic
            ? 'border-amber-200 hover:border-amber-300'
            : 'border-slate-200 hover:border-indigo-200'
      }`}
    >
      {/* HOT 논문: 상단 강조 바 */}
      {isHot && (
        <div className="h-1 bg-gradient-to-r from-orange-400 to-rose-400" />
      )}
      {/* Classic 논문: 상단 강조 바 */}
      {!isHot && isClassic && (
        <div className="h-1 bg-gradient-to-r from-amber-400 to-yellow-300" />
      )}

      <div className="p-6">
        {/* 상단: 카테고리 + 순위 + upvotes */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap gap-1.5 items-center">
            {isHot && (
              <span className="text-xs font-bold text-orange-500 mr-0.5">🔥 HOT</span>
            )}
            {slotLabel && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {slotLabel}
              </span>
            )}
            {(paper.categories ?? []).map((c) => (
              <CategoryBadge key={c} category={c} />
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0 text-xs text-slate-400">
            {rank != null && (
              <span className="font-mono text-slate-300">#{rank}</span>
            )}
            <span className="font-semibold">▲ {paper.upvotes}</span>
          </div>
        </div>

        {/* 제목 */}
        <Link href={`/papers/${paper.arxiv_id}`} className="block mb-1 group/title">
          <h2 className="text-base font-bold text-slate-900 group-hover/title:text-indigo-600 leading-snug transition-colors">
            {title}
          </h2>
        </Link>
        {paper.title_ko && (
          <p className="text-xs text-slate-400 mb-4 leading-relaxed line-clamp-1">
            {paper.title_en}
          </p>
        )}

        {/* 한 줄 요약 강조 */}
        {oneLiner && (
          <div className="bg-slate-50 border-l-[3px] border-indigo-400 rounded-r-lg px-4 py-2.5 mb-4">
            <p className="text-sm text-slate-700 leading-relaxed">{oneLiner}</p>
          </div>
        )}

        {/* 핵심 기여 미리보기 */}
        {contributions.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              핵심 기여
            </p>
            <ul className="space-y-1.5">
              {contributions.slice(0, 2).map((c, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-slate-600 leading-snug">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-300 shrink-0" />
                  <span className="line-clamp-2">{c}</span>
                </li>
              ))}
              {contributions.length > 2 && (
                <li className="text-xs text-slate-400 pl-4">
                  + {contributions.length - 2}개 더 보기 →
                </li>
              )}
            </ul>
          </div>
        )}

        {/* 하단: 저자 + 링크 */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-400 truncate">
            {authors.length > 0
              ? `${authors.join(', ')}${hasMoreAuthors ? ' 외' : ''}`
              : '저자 미상'}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://arxiv.org/abs/${paper.arxiv_id}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-indigo-600 transition-colors font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              arXiv ↗
            </a>
            {paper.github_repo && (
              <a
                href={paper.github_repo}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-slate-400 hover:text-indigo-600 transition-colors font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                GitHub ↗
              </a>
            )}
            {paper.project_page && (
              <a
                href={paper.project_page}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-slate-400 hover:text-indigo-600 transition-colors font-medium"
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
