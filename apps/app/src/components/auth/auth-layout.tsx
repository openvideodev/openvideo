import Link from "next/link";
import { LogoIcons } from "@/components/shared/logos";
import { Button } from "@/components/ui/button";
import { FakeAIAssistant } from "./fake-ai-assistant";
import { BrowserWithBackgroundLayer } from "@/components/browser-with-background-layer";
import { FullWidthBorder } from "@/components/full-width-border";

interface AuthLayoutProps {
  children: React.ReactNode;
  headerLink?: { href: string; label: string };
  variant?: "split" | "single";
}

export function AuthLayout({ children, headerLink, variant = "split" }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center bg-card">
      {/* Header - full width */}
      <header className="w-full max-w-7xl h-14 flex items-center px-4 border-b border-l border-r sticky top-0 z-20 bg-card/60 backdrop-blur-sm border-dashed">
        <div className="w-full flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 font-semi tracking-tight">
            <LogoIcons.scenify className="size-5" />
            <span>OpenVideo</span>
          </Link>
          {headerLink && (
            <Button variant="outline" size="sm" asChild>
              <Link href={headerLink.href}>{headerLink.label}</Link>
            </Button>
          )}
        </div>
      </header>
      <div>
        <FullWidthBorder />
      </div>

      {/* Main content */}
      <div className="w-full max-w-7xl flex-1 flex border-x border-dashed">
        {/* Left side - Auth form */}
        <div className="flex-1 flex flex-col">
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-[380px]">{children}</div>
          </main>
        </div>

        {/* Right side - AI Assistant Demo (only in split mode) */}
        {variant === "split" && (
          <div className="hidden lg:flex flex-1 relative overflow-hidden border-l">
            <BrowserWithBackgroundLayer />
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="pointer-events-auto w-80 h-[600px] bg-card">
                <FakeAIAssistant />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
