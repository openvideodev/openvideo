import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { Inter } from 'next/font/google';

import type { Metadata } from 'next';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    template: '%s | Combo',
    default: 'Combo | The Video SDK for Modern Web',
  },
  description:
    'DesignCombo is a framework-agnostic video editor SDK built on WebCodecs and PixiJS.',
  openGraph: {
    title: 'Combo | The Video SDK for Modern Web',
    description: 'Build professional video editing experiences in the browser.',
    url: 'https://docs.combo.sh',
    siteName: 'Combo',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Combo | The Video SDK for Modern Web',
    description: 'Build professional video editing experiences in the browser.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
