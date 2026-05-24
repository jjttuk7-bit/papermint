'use client';
import type { DailyPaperRow } from '@/types/paper';
import PaperCard from './PaperCard';

export default function ClassicsSection({ classics }: { classics: DailyPaperRow[] }) {
  if (classics.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-amber-700 flex items-center gap-1.5">
          🏛️ 오늘의 역대급
          <span className="text-xs font-normal text-slate-400">(분야별 1편씩 순환 큐레이션)</span>
        </h2>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {classics.map((dp) => (
          <PaperCard key={dp.paper.arxiv_id} dailyPaper={dp} />
        ))}
      </div>
      <hr className="mt-6 border-slate-200" />
    </section>
  );
}
