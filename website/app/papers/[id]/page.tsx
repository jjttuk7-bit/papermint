import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllArxivIds, getPaperByArxivId } from '@/lib/db';
import CategoryBadge from '@/components/CategoryBadge';

function splitAbstract(text: string): string[] {
  return text
    // 한국어 문장 끝(다/요/니다/습니다 + 마침표) 뒤에 줄바꿈
    .replace(/([다요]\.)\s+/g, '$1\n')
    // 영어 문장 끝(마침표 + 공백 + 대문자) 뒤에 줄바꿈
    .replace(/([.!?])\s+([A-Z])/g, '$1\n$2')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 15);
}

interface Props {
  params: { id: string };
}

export async function generateStaticParams() {
  return getAllArxivIds().map((id) => ({ id }));
}

export function generateMetadata({ params }: Props) {
  const paper = getPaperByArxivId(params.id);
  if (!paper) return {};
  const title = paper.title_ko ?? paper.title_en;
  const description = paper.one_liner_ko ?? paper.one_liner_en ?? '';
  const url = `https://papermint-omega.vercel.app/papers/${params.id}`;
  return {
    title,
    description,
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      publishedTime: paper.published_at ?? undefined,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
}

export default function PaperPage({ params }: Props) {
  const paper = getPaperByArxivId(params.id);
  if (!paper) notFound();

  const contributions = paper.contributions_ko ?? paper.contributions_en ?? [];
  const abstract = paper.abstract_ko ?? paper.abstract_en;
  const summary = paper.ai_summary_ko ?? paper.ai_summary_en;
  const authors = paper.authors ?? [];
  const methodology = paper.methodology_ko;
  const results = paper.results_ko;
  const limitations = paper.limitations_ko;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: paper.title_ko ?? paper.title_en,
    description: paper.one_liner_ko ?? paper.one_liner_en ?? '',
    author: authors.map((name) => ({ '@type': 'Person', name })),
    datePublished: paper.published_at ?? undefined,
    inLanguage: 'ko',
    url: `https://papermint-omega.vercel.app/papers/${paper.arxiv_id}`,
    sameAs: `https://arxiv.org/abs/${paper.arxiv_id}`,
    publisher: {
      '@type': 'Organization',
      name: 'papermint',
      url: 'https://papermint-omega.vercel.app',
    },
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* 뒤로가기 */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-500 mb-10 transition-colors group"
      >
        <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
        목록으로
      </Link>

      {/* 카테고리 + upvotes */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {(paper.categories ?? []).map((c) => (
          <CategoryBadge key={c} category={c} />
        ))}
        <span className="ml-auto text-sm text-slate-400 font-semibold">▲ {paper.upvotes}</span>
      </div>

      {/* 제목 */}
      <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-2">
        {paper.title_ko ?? paper.title_en}
      </h1>
      {paper.title_ko && (
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">{paper.title_en}</p>
      )}

      {/* 저자 + 링크 */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {authors.length > 0 && (
          <p className="text-sm text-slate-500 mr-2">
            {authors.slice(0, 5).join(', ')}{authors.length > 5 ? ` 외 ${authors.length - 5}명` : ''}
          </p>
        )}
        <a
          href={`https://arxiv.org/abs/${paper.arxiv_id}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-indigo-600 transition-colors"
        >
          arXiv 원문 ↗
        </a>
        {paper.github_repo && (
          <a
            href={paper.github_repo}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
          >
            GitHub ↗
          </a>
        )}
        {paper.project_page && (
          <a
            href={paper.project_page}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
          >
            Project ↗
          </a>
        )}
      </div>

      {/* 한 줄 요약 — 강조 블록 */}
      {(paper.one_liner_ko ?? paper.one_liner_en) && (
        <div className="relative bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl px-6 py-5 mb-10 border border-indigo-100">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">한 줄 요약</p>
          <p className="text-base text-indigo-900 leading-relaxed font-medium">
            {paper.one_liner_ko ?? paper.one_liner_en}
          </p>
        </div>
      )}

      {/* 핵심 기여 */}
      {contributions.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-indigo-500 inline-block" />
            핵심 기여
          </h2>
          <ul className="space-y-3">
            {contributions.map((c, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-700 leading-relaxed pt-0.5">{c}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 방법론 */}
      {methodology && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-violet-500 inline-block" />
            방법론
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 px-6 py-5">
            <p className="text-sm text-slate-700 leading-relaxed">{methodology}</p>
          </div>
        </section>
      )}

      {/* 핵심 결과 */}
      {results && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-emerald-500 inline-block" />
            핵심 결과
          </h2>
          <div className="bg-emerald-50 rounded-xl border border-emerald-100 px-6 py-5">
            <p className="text-sm text-emerald-900 leading-relaxed font-medium">{results}</p>
          </div>
        </section>
      )}

      {/* 한계점 */}
      {limitations && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-amber-400 inline-block" />
            한계점
          </h2>
          <div className="bg-amber-50 rounded-xl border border-amber-100 px-6 py-5">
            <p className="text-sm text-amber-900 leading-relaxed">{limitations}</p>
          </div>
        </section>
      )}

      {/* AI 요약 */}
      {summary && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-emerald-500 inline-block" />
            AI 요약
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 px-6 py-5">
            <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
          </div>
        </section>
      )}

      {/* 초록 */}
      {abstract && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-slate-400 inline-block" />
            초록
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 px-6 py-6 space-y-4">
            {splitAbstract(abstract).map((sentence, i) => (
              <p key={i} className="text-[15px] text-slate-600 leading-[1.9]">
                {sentence}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* 하단 링크 */}
      <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          ← 목록으로
        </Link>
        <a
          href={`https://arxiv.org/abs/${paper.arxiv_id}`}
          target="_blank" rel="noopener noreferrer"
          className="text-sm text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
        >
          논문 전체 보기 ↗
        </a>
      </div>
    </main>
  );
}
