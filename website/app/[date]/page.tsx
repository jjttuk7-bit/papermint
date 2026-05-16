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
  const description = `${params.date} HuggingFace Papers 상위 AI/ML 논문을 한국어로 번역·요약했습니다.`;
  return {
    title: `${params.date} AI 논문 요약`,
    description,
    openGraph: {
      title: `${params.date} AI 논문 요약`,
      description,
      url: `https://papermint.vercel.app/${params.date}`,
    },
    alternates: {
      canonical: `https://papermint.vercel.app/${params.date}`,
    },
  };
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
