import Link from 'next/link';
import { searchPapers } from '@/lib/db';
import PaperCard from '@/components/PaperCard';
import SearchBar from '@/components/SearchBar';

interface Props {
  searchParams: { q?: string };
}

export function generateMetadata({ searchParams }: Props) {
  const q = searchParams.q;
  return { title: q ? `"${q}" 검색 결과 — papermint` : '논문 검색 — papermint' };
}

export default function SearchPage({ searchParams }: Props) {
  const q = (searchParams.q ?? '').trim();
  const results = q ? searchPapers(q, 50) : [];

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 pb-20">
      {/* 검색 헤더 */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900 mb-4">논문 검색</h1>
        <SearchBar defaultValue={q} />
      </div>

      {/* 결과 */}
      {q && (
        <p className="text-sm text-slate-500 mb-4">
          <strong className="text-slate-700">&quot;{q}&quot;</strong> 검색 결과{' '}
          <strong className="text-slate-700">{results.length}건</strong>
        </p>
      )}

      {!q && (
        <p className="text-center text-slate-400 mt-20 text-sm">
          논문 제목, 키워드, 요약으로 검색하세요.
        </p>
      )}

      <div className="grid gap-3">
        {results.map((paper) => (
          <PaperCard
            key={paper.arxiv_id}
            dailyPaper={{ rank: null, importance: 'normal', paper }}
          />
        ))}
      </div>

      {q && results.length === 0 && (
        <div className="text-center mt-20">
          <p className="text-slate-400 text-sm">검색 결과가 없습니다.</p>
          <Link href="/" className="text-sm text-indigo-500 hover:underline mt-2 inline-block">
            최신 논문 보기 →
          </Link>
        </div>
      )}
    </main>
  );
}
