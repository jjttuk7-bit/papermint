'use client';
import { useState } from 'react';
import type { DailyPaperRow } from '@/types/paper';
import PaperCard from './PaperCard';

const CATEGORIES = [
  '전체', 'NLP', 'CV', 'Multimodal', 'Agent', 'RL',
  'Alignment', 'Efficiency', 'Medical AI', 'Robotics',
  'Audio', 'Video', 'Theory', 'Survey',
];

export default function PapersView({
  papers,
  total,
  date,
}: {
  papers: DailyPaperRow[];
  total: number;
  date: string;
}) {
  const [active, setActive] = useState<string | null>(null);

  const filtered = active
    ? papers.filter((dp) => dp.paper.categories?.includes(active))
    : papers;

  const hot = !active ? filtered.filter((dp) => dp.importance === 'hot') : [];
  const regular = !active ? filtered.filter((dp) => dp.importance !== 'hot') : filtered;

  return (
    <>
      {/* 카테고리 필터 */}
      <div className="flex flex-wrap gap-1.5 py-3">
        {CATEGORIES.map((cat) => {
          const isActive = cat === '전체' ? !active : cat === active;
          return (
            <button
              key={cat}
              onClick={() => setActive(cat === '전체' ? null : cat)}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 통계 */}
      <div className="flex items-center gap-3 text-xs text-slate-400 mb-5">
        <span>
          {date} ·{' '}
          <strong className="text-slate-600">
            {active ? `${filtered.length}편` : `${papers.length}편`}
          </strong>
          {active && <span className="text-slate-400"> / 전체 {papers.length}편</span>}
        </span>
        <span className="text-slate-300">|</span>
        <span>누적 {total}편</span>
        <span className="text-slate-300">|</span>
        <span>다음 업데이트 KST 09:00</span>
      </div>

      {/* 🔥 HOT */}
      {hot.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-orange-500 mb-3 flex items-center gap-1.5">
            🔥 오늘의 주목 논문
            <span className="text-xs font-normal text-slate-400">(upvotes 100+)</span>
          </h2>
          <div className="grid gap-3">
            {hot.map((dp) => (
              <PaperCard key={dp.paper.arxiv_id} dailyPaper={dp} />
            ))}
          </div>
          <hr className="my-6 border-slate-200" />
        </section>
      )}

      {/* 논문 목록 */}
      {hot.length > 0 && !active && (
        <h2 className="text-sm font-semibold text-slate-500 mb-3">전체 논문</h2>
      )}
      <div className="grid gap-3">
        {regular.map((dp) => (
          <PaperCard key={dp.paper.arxiv_id} dailyPaper={dp} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-slate-400 mt-16">해당 카테고리 논문이 없습니다.</p>
      )}
    </>
  );
}
