export default function Footer() {
  return (
    <footer className="border-t border-slate-200 mt-16 py-8 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 space-y-2 text-center">
        <p className="text-xs text-slate-400">
          본 사이트는{' '}
          <a
            href="https://huggingface.co/papers"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600 transition-colors"
          >
            HuggingFace Papers
          </a>
          의 공식 서비스가 아닌 독립 개발자 프로젝트입니다.
        </p>
        <p className="text-xs text-slate-400">
          논문 정보는 각 저자에게 귀속되며, 원문은 arXiv에서 확인할 수 있습니다.
          요약·번역은 참고용으로만 활용하세요.
        </p>
        <p className="text-xs text-slate-300 pt-1">
          © {new Date().getFullYear()} papermint
        </p>
      </div>
    </footer>
  );
}
