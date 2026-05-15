import { getAvailableDates, getPapersForDate, getStats } from '@/lib/db';
import DateArchive from '@/components/DateArchive';
import CategoryFilter from '@/components/CategoryFilter';
import PaperCard from '@/components/PaperCard';

interface Props {
  searchParams: { category?: string };
}

export default function Home({ searchParams }: Props) {
  const category = searchParams.category;
  const dates = getAvailableDates();
  const latestDate = dates[0];

  if (!latestDate) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-24 text-center">
        <p className="text-2xl font-semibold text-slate-300">아직 수집된 논문이 없습니다</p>
        <p className="text-sm text-slate-400 mt-2">매일 KST 09:00에 업데이트됩니다.</p>
      </main>
    );
  }

  const allPapers = getPapersForDate(latestDate, category);
  const { total } = getStats();
  const hotPapers = !category ? allPapers.filter((dp) => dp.importance === 'hot') : [];
  const regularPapers = !category
    ? allPapers.filter((dp) => dp.importance !== 'hot')
    : allPapers;

  return (
    <main>
      <DateArchive dates={dates} currentDate={latestDate} />

      <div className="max-w-4xl mx-auto px-4 pb-16">
        <CategoryFilter current={category} basePath="/" />

        {/* 통계 */}
        <div className="flex items-center gap-3 text-xs text-slate-400 mb-5">
          <span>{latestDate} · <strong className="text-slate-600">{allPapers.length}편</strong></span>
          <span className="text-slate-300">|</span>
          <span>누적 {total}편</span>
          <span className="text-slate-300">|</span>
          <span>다음 업데이트 KST 09:00</span>
        </div>

        {/* 🔥 HOT 논문 */}
        {hotPapers.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-orange-500 mb-3 flex items-center gap-1.5">
              🔥 오늘의 주목 논문
              <span className="text-xs font-normal text-slate-400">(upvotes 100+)</span>
            </h2>
            <div className="grid gap-3">
              {hotPapers.map((dp) => (
                <PaperCard key={dp.paper.arxiv_id} dailyPaper={dp} />
              ))}
            </div>
            <hr className="my-6 border-slate-200" />
          </section>
        )}

        {/* 전체 목록 */}
        {hotPapers.length > 0 && (
          <h2 className="text-sm font-semibold text-slate-500 mb-3">전체 논문</h2>
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
