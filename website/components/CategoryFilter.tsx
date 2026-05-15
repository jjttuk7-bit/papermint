import Link from 'next/link';

const CATEGORIES = [
  '전체', 'NLP', 'CV', 'Multimodal', 'Agent', 'RL',
  'Alignment', 'Efficiency', 'Medical AI', 'Robotics',
  'Audio', 'Video', 'Theory', 'Survey',
];

interface Props {
  current?: string;
  basePath: string;
}

export default function CategoryFilter({ current, basePath }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5 py-3">
      {CATEGORIES.map((cat) => {
        const isActive = cat === '전체' ? !current : cat === current;
        const href = cat === '전체'
          ? basePath
          : `${basePath}?category=${encodeURIComponent(cat)}`;
        return (
          <Link
            key={cat}
            href={href}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              isActive
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat}
          </Link>
        );
      })}
    </div>
  );
}
