import { notFound } from 'next/navigation';
import { getAvailableDates, getMonthlyDates, getPapersForDate, getStats } from '@/lib/db';
import DateArchive from '@/components/DateArchive';
import PapersView from '@/components/PapersView';

interface Props {
  params: { date: string };
}

export async function generateStaticParams() {
  return getAvailableDates().map((date) => ({ date }));
}

export function generateMetadata({ params }: Props) {
  return { title: `${params.date} 논문 요약 — papermint` };
}

export default function DatePage({ params }: Props) {
  const dates = getAvailableDates();
  if (!dates.includes(params.date)) notFound();

  const papers = getPapersForDate(params.date);
  const { total } = getStats();
  const monthlyDates = getMonthlyDates();

  return (
    <main>
      <DateArchive dates={dates} currentDate={params.date} monthlyDates={monthlyDates} />
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <PapersView papers={papers} total={total} date={params.date} />
      </div>
    </main>
  );
}
