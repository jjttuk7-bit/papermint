import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Props {
  dates: string[];
  currentDate: string;
}

export default function Header({ dates, currentDate }: Props) {
  const recent = dates.slice(0, 7);

  return (
    <header className="border-b border-gray-200 mb-8">
      <div className="max-w-3xl mx-auto px-4 py-5">
        <div className="flex items-baseline gap-3 mb-4">
          <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-blue-600">
            papermint
          </Link>
          <span className="text-sm text-gray-400">AI 논문 한국어 요약</span>
        </div>

        <nav className="flex flex-wrap gap-2">
          {recent.map((date) => {
            const isActive = date === currentDate;
            const label = format(new Date(date + 'T00:00:00'), 'M/d (EEE)', { locale: ko });
            return (
              <Link
                key={date}
                href={date === dates[0] ? '/' : `/${date}/`}
                className={`text-sm px-3 py-1 rounded-full transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
