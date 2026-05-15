import { notFound } from 'next/navigation';
import { getAvailableDates, getPapersForDate, getStats } from '@/lib/db';
import DateArchive from '@/components/DateArchive';
import CategoryFilter from '@/components/CategoryFilter';
import PaperCard from '@/components/PaperCard';

interface Props {
  params: { date: string };
  searchParams: { category?: string };
}

export async function generateStaticParams() {
  return getAvailableDates().map((date) => ({ date }));
}

export function generateMetadata({ params }: Props) {
  return { title: `${params.date} 논문 요약 — papermint` };
}

export default function DatePage({ params, searchParams }: Props) {
  const dates = getAvailableDates();
  if (!dates.includes(params.date)) notFound();

  const category = searchParams.category;
  const allPapers = getPapersForDate(params.date, category);
  const { total } = getStats();
  const hotPapers = !category ? allPapers.filter((dp) => dp.importance === 'hot') : [];
  const regularPapers = !category
    ? allPapers.filter((dp) => dp.importance !== 'hot')
    : allPapers;
  const basePath = `/${params.date}`;

  return (
    <main>
      <DateArchive dates={dates} currentDate={params.date} />

      <div className="max-w-4xl mx-auto px-4 pb-16">
        <CategoryFilter current={category} basePath={basePath} />

        <div className="flex items-center gap-3 text-xs text-slate-400 mb-5">
          <span>{params.date} · <strong className="text-slate-600">{allPapers.length}편</strong></span>
          <span className="text-slate-300">|</span>
          <span>누적 {total}편</span>
        </div>

        {hotPapers.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-orange-500 mb-3">🔥 오늘의 주목 논문</h2>
            <div className="grid gap-3">
              {hotPapers.map((dp) => (
                <PaperCard key={dp.paper.arxiv_id} dailyPaper={dp} />
              ))}
            </div>
            <hr className="my-6 border-slate-200" />
          </section>
        )}

        <div className="grid gap-3">
          {regularPapers.map((dp) => (
            <PaperCard key={dp.paper.arxiv_id} dailyPaper={dp} />
          ))}
        </div>

        {allPapers.length === 0 && (
          <p className="text-center text-slate-400 mt-16">해당 카테고리 논문이 없습니다.</p>
        )}
      </div>
    </main>
  );
}
