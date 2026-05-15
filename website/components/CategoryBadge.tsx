const COLORS: Record<string, string> = {
  NLP:          'bg-blue-100 text-blue-700',
  CV:           'bg-green-100 text-green-700',
  Multimodal:   'bg-purple-100 text-purple-700',
  RL:           'bg-orange-100 text-orange-700',
  Efficiency:   'bg-gray-100 text-gray-600',
  'Medical AI': 'bg-red-100 text-red-700',
  Audio:        'bg-yellow-100 text-yellow-700',
  Video:        'bg-pink-100 text-pink-700',
  Robotics:     'bg-indigo-100 text-indigo-700',
  Theory:       'bg-slate-100 text-slate-600',
  Survey:       'bg-stone-100 text-stone-600',
  Agent:        'bg-cyan-100 text-cyan-700',
  Alignment:    'bg-rose-100 text-rose-700',
};

export default function CategoryBadge({ category }: { category: string }) {
  const color = COLORS[category] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {category}
    </span>
  );
}
