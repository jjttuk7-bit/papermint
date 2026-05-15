import { getAvailableDates, getPapersForDate } from '@/lib/db';
import Header from '@/components/Header';
import PaperCard from '@/components/PaperCard';
import { notFound } from 'next/navigation';


interface Props {
  params: { date: string };
}

export async function generateStaticParams() {
  return getAvailableDates().map((date) => ({ date }));
}

export function generateMetadata({ params }: Props) {
  return {
    title: `${params.date} 논문 요약 — papermint`,
  };
}

export default function DatePage({ params }: Props) {
  const dates = getAvailableDates();
  if (!dates.includes(params.date)) notFound();

  const papers = getPapersForDate(params.date);

  return (
    <main>
      <Header dates={dates} currentDate={params.date} />
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
