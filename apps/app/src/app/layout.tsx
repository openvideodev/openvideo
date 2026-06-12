import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Outfit, Inter, Figtree } from "next/font/google";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree-sans" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit-sans" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "OpenVideo - Open Source AI Video Editor",
    template: "%s | OpenVideo",
  },
  description:
    "Open-source AI Video Editor with client-side rendering (WebCodecs) and AI Copilot. Edit videos directly in your browser with powerful AI-assisted tools.",
  keywords: [
    "video editor",
    "AI video editor",
    "open source",
    "open source video editor",
    "free video editor",
    "webcodecs",
    "browser video editing",
    "AI copilot",
    "github",
  ],
  authors: [{ name: "OpenVideo" }],
  creator: "OpenVideo",
  metadataBase: new URL("https://ai.openvideo.dev"),
  openGraph: {
    title: "OpenVideo - Open Source AI Video Editor",
    description:
      "Free, open-source AI Video Editor with client-side rendering (WebCodecs) and AI Copilot. Edit videos in your browser.",
    url: "https://ai.openvideo.dev",
    siteName: "OpenVideo",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "OpenVideo - AI Video Editor",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenVideo - Open Source AI Video Editor",
    description:
      "Free, open-source AI Video Editor with client-side rendering (WebCodecs) and AI Copilot. Edit videos in your browser.",
    images: ["/og.png"],
    creator: "@openvideo",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        geistMono.variable,
        figtree.variable,
        outfit.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <head />
      <body className={`antialiased dark`}>
        <TRPCProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </TRPCProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
