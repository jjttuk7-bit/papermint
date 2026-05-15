import { getAvailableDates, getMonthlyDates, getPapersForDate, getStats } from '@/lib/db';
import DateArchive from '@/components/DateArchive';
import PapersView from '@/components/PapersView';

export default function Home() {
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

  const papers = getPapersForDate(latestDate);
  const { total } = getStats();
  const monthlyDates = getMonthlyDates();

  return (
    <main>
      <DateArchive dates={dates} currentDate={latestDate} monthlyDates={monthlyDates} />
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <PapersView papers={papers} total={total} date={latestDate} />
      </div>
    </main>
  );
}
