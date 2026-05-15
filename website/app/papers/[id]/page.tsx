import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllArxivIds, getPaperByArxivId } from '@/lib/db';
import CategoryBadge from '@/components/CategoryBadge';

export const dynamicParams = false;

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
    <main className="max-w-3xl mx-auto px-4 py-10 pb-20">
      {/* 뒤로가기 */}
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block">
        ← 목록으로
      </Link>

      {/* 카테고리 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(paper.categories ?? []).map((c) => (
          <CategoryBadge key={c} category={c} />
        ))}
      </div>

      {/* 제목 */}
      <h1 className="text-xl font-bold text-gray-900 leading-snug mb-1">
        {paper.title_ko ?? paper.title_en}
      </h1>
      {paper.title_ko && (
        <p className="text-sm text-gray-400 mb-4">{paper.title_en}</p>
      )}

      {/* 메타 */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
        {authors.length > 0 && <span>{authors.slice(0, 5).join(', ')}{authors.length > 5 ? ' 외' : ''}</span>}
        <span>▲ {paper.upvotes}</span>
        <a
          href={`https://arxiv.org/abs/${paper.arxiv_id}`}
          target="_blank" rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          arXiv
        </a>
        {paper.github_repo && (
          <a href={paper.github_repo} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            GitHub
          </a>
        )}
        {paper.project_page && (
          <a href={paper.project_page} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            Project
          </a>
        )}
      </div>

      {/* 한 줄 요약 */}
      {(paper.one_liner_ko ?? paper.one_liner_en) && (
        <blockquote className="border-l-4 border-blue-400 pl-4 text-gray-700 italic mb-8">
          {paper.one_liner_ko ?? paper.one_liner_en}
        </blockquote>
      )}

      {/* 핵심 기여 */}
      {contributions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-3">핵심 기여</h2>
          <ul className="space-y-2">
            {contributions.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="text-blue-400 font-bold mt-0.5">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* AI 요약 */}
      {summary && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-3">AI 요약</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
        </section>
      )}

      {/* 초록 */}
      {abstract && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-3">초록</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{abstract}</p>
        </section>
      )}
    </main>
  );
}
