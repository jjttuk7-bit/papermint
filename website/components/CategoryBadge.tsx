const COLORS: Record<string, string> = {
  NLP:          'bg-blue-50 text-blue-600 ring-1 ring-blue-100',
  CV:           'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
  Multimodal:   'bg-violet-50 text-violet-600 ring-1 ring-violet-100',
  RL:           'bg-orange-50 text-orange-600 ring-1 ring-orange-100',
  Efficiency:   'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  'Medical AI': 'bg-red-50 text-red-600 ring-1 ring-red-100',
  Audio:        'bg-yellow-50 text-yellow-600 ring-1 ring-yellow-100',
  Video:        'bg-pink-50 text-pink-600 ring-1 ring-pink-100',
  Robotics:     'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100',
  Theory:       'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  Survey:       'bg-stone-100 text-stone-500 ring-1 ring-stone-200',
  Agent:        'bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100',
  Alignment:    'bg-rose-50 text-rose-600 ring-1 ring-rose-100',
};

export default function CategoryBadge({ category }: { category: string }) {
  const color = COLORS[category] ?? 'bg-slate-100 text-slate-500 ring-1 ring-slate-200';
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md ${color}`}>
      {category}
    </span>
  );
}
