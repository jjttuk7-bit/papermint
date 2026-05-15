import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'papermint — AI 논문 한국어 요약',
  description: '매일 HuggingFace Papers의 AI/ML 논문을 한국어로 요약합니다.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
