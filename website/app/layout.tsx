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
  metadataBase: new URL('https://papermint.vercel.app'),
  title: {
    default: 'papermint — AI 논문 한국어 요약',
    template: '%s — papermint',
  },
  description: '매일 HuggingFace Papers 상위 AI/ML 논문을 한국어로 번역·요약합니다. 최신 딥러닝, NLP, 컴퓨터 비전 연구를 한국어로 쉽게 읽으세요.',
  keywords: ['AI 논문', 'ML 논문', '인공지능', '딥러닝', 'NLP', '컴퓨터 비전', '논문 요약', '한국어'],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'papermint',
    title: 'papermint — AI 논문 한국어 요약',
    description: '매일 HuggingFace Papers 상위 AI/ML 논문을 한국어로 번역·요약합니다.',
    url: 'https://papermint.vercel.app',
  },
  twitter: {
    card: 'summary',
    // TODO: X 계정 핸들 확인 후 site/creator 추가
  },
  alternates: {
    canonical: 'https://papermint.vercel.app',
  },
  verification: {
    google: 'sBPk0JemMnPNQg1-iQuDLX6ikDp52y5-OAwCtLyIFaI',
  },
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
