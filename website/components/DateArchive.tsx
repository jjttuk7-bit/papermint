import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MonthGroup {
  month: string;
  label: string;
  dates: string[];
}

interface Props {
  dates: string[];
  currentDate: string;
  monthlyDates: MonthGroup[];
}

function fmtTab(date: string) {
  return format(new Date(date + 'T00:00:00'), 'M/d (EEE)', { locale: ko });
}

export default function DateArchive({ dates, currentDate, monthlyDates }: Props) {
  const recent = dates.slice(0, 7);
  const hasMore = dates.length > 7;

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2 flex-wrap">
        {recent.map((date) => {
          const isActive = date === currentDate;
          return (
            <Link
              key={date}
              href={date === dates[0] ? '/' : `/${date}`}
              className={`text-sm px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {fmtTab(date)}
            </Link>
          );
        })}

        {hasMore && (
          <details className="relative">
            <summary className="text-sm px-3 py-1 rounded-full text-slate-500 hover:bg-slate-100 cursor-pointer select-none list-none">
              더 보기 ▾
            </summary>
            <div className="absolute top-full mt-2 left-0 z-40 bg-white border border-slate-200 rounded-xl shadow-xl p-4 min-w-[280px] max-h-80 overflow-y-auto">
              {monthlyDates.map(({ month, label, dates: mDates }) => (
                <div key={month} className="mb-4 last:mb-0">
                  <p className="text-xs font-semibold text-slate-400 mb-2">{label}</p>
                  <div className="flex flex-wrap gap-1">
                    {mDates.map((d) => (
                      <Link
                        key={d}
                        href={d === dates[0] ? '/' : `/${d}`}
                        className={`text-xs px-2 py-0.5 rounded transition-colors ${
                          d === currentDate
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {d.slice(5)}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
