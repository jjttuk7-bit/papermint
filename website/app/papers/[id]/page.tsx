import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllArxivIds, getPaperByArxivId } from '@/lib/db';
import CategoryBadge from '@/components/CategoryBadge';

interface Props {
  params: { id: string };
}

export async function generateStaticParams() {
  return getAllArxivIds().map((id) => ({ id }));
}

export function generateMetadata({ params }: Props) {
  const paper = getPaperByArxivId(params.id);
  if (!paper) return {};
  return {
    title: `${paper.title_ko ?? paper.title_en} — papermint`,
    description: paper.one_liner_ko ?? paper.one_liner_en ?? '',
  };
}

export default function PaperPage({ params }: Props) {
  const paper = getPaperByArxivId(params.id);
  if (!paper) notFound();

  const contributions = paper.contributions_ko ?? paper.contributions_en ?? [];
  const abstract = paper.abstract_ko ?? paper.abstract_en;
  const summary = paper.ai_summary_ko ?? paper.ai_summary_en;
  const authors = paper.authors ?? [];

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 pb-20">
      {/* 뒤로가기 */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mb-8 transition-colors"
      >
        ← 목록으로
      </Link>

      {/* 카테고리 + upvotes */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {(paper.categories ?? []).map((c) => (
          <CategoryBadge key={c} category={c} />
        ))}
        <span className="ml-auto text-xs text-slate-400 font-mono">▲ {paper.upvotes}</span>
      </div>

      {/* 제목 */}
      <h1 className="text-xl font-bold text-slate-900 leading-snug mb-1">
        {paper.title_ko ?? paper.title_en}
      </h1>
      {paper.title_ko && (
        <p className="text-sm text-slate-400 mb-5">{paper.title_en}</p>
      )}

      {/* 메타 링크 */}
      <div className="flex flex-wrap items-center gap-3 text-sm mb-6">
        {authors.length > 0 && (
          <span className="text-slate-500">
            {authors.slice(0, 5).join(', ')}{authors.length > 5 ? ` 외 ${authors.length - 5}명` : ''}
          </span>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`https://arxiv.org/abs/${paper.arxiv_id}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
          >
            arXiv ↗
          </a>
          {paper.github_repo && (
            <a
              href={paper.github_repo}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            >
              GitHub ↗
            </a>
          )}
          {paper.project_page && (
            <a
              href={paper.project_page}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            >
              Project ↗
            </a>
          )}
        </div>
      </div>

      {/* 한 줄 요약 */}
      {(paper.one_liner_ko ?? paper.one_liner_en) && (
        <div className="bg-indigo-50 border-l-4 border-indigo-400 rounded-r-lg px-5 py-4 mb-8">
          <p className="text-sm text-indigo-900 leading-relaxed font-medium">
            {paper.one_liner_ko ?? paper.one_liner_en}
          </p>
        </div>
      )}

      {/* 핵심 기여 */}
      {contributions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-slate-900 mb-4">핵심 기여</h2>
          <ul className="space-y-2.5">
            {contributions.map((c, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* AI 요약 */}
      {summary && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-slate-900 mb-3">AI 요약</h2>
          <p className="text-sm text-slate-700 leading-relaxed bg-white rounded-xl border border-slate-200 p-5">
            {summary}
          </p>
        </section>
      )}

      {/* 초록 */}
      {abstract && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-slate-900 mb-3">초록</h2>
          <p className="text-sm text-slate-600 leading-relaxed bg-white rounded-xl border border-slate-200 p-5">
            {abstract}
          </p>
        </section>
      )}
    </main>
  );
}
