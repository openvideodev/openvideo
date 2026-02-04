import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { Inter } from 'next/font/google';

import type { Metadata } from 'next';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    template: '%s | OpenVideo',
    default: 'OpenVideo | The Video SDK for Modern Web',
  },
  description:
    'OpenVideo is a framework-agnostic video editor SDK built on WebCodecs and PixiJS.',
  openGraph: {
    title: 'OpenVideo | The Video SDK for Modern Web',
    description: 'Build professional video editing experiences in the browser.',
    url: 'https://docs.openvideo.dev',
    siteName: 'OpenVideo',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenVideo | The Video SDK for Modern Web',
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
