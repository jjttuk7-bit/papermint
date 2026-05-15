import Link from 'next/link';
import SearchBar from './SearchBar';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-lg font-bold text-slate-900 tracking-tight">papermint</span>
          <span className="text-xs text-slate-400 hidden sm:block">AI 논문 한국어 요약</span>
        </Link>
        <div className="flex-1" />
        <SearchBar />
        <Link
          href="/search"
          className="text-sm text-slate-500 hover:text-slate-900 transition-colors hidden sm:block"
        >
          전체 검색
        </Link>
      </div>
    </header>
  );
}
