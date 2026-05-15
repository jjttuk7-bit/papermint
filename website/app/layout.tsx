import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'papermint — AI 논문 한국어 요약',
  description: '매일 HuggingFace Papers의 최신 AI/ML 논문을 한국어로 번역·요약합니다.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={inter.variable}>
      <body>
        <GoogleAnalytics />
        <Header />
        {children}
      </body>
    </html>
  );
}
