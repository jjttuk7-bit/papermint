import { getAvailableDates, getPapersForDate } from '@/lib/db';
import Header from '@/components/Header';
import PaperCard from '@/components/PaperCard';

export default function Home() {
  const dates = getAvailableDates();
  const latestDate = dates[0];

  if (!latestDate) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-400">
        <p className="text-lg">아직 수집된 논문이 없습니다.</p>
        <p className="text-sm mt-2">매일 KST 09:00에 업데이트됩니다.</p>
      </main>
    );
  }

  const papers = getPapersForDate(latestDate);

  return (
    <main>
      <Header dates={dates} currentDate={latestDate} />
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <p className="text-sm text-gray-400 mb-5">{papers.length}편</p>
        <div className="flex flex-col gap-4">
          {papers.map((dp) => (
            <PaperCard key={dp.paper.arxiv_id} dailyPaper={dp} />
          ))}
        </div>
      </div>
    </main>
  );
}
