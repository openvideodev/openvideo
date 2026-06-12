import type { ReactNode } from "react";
import { BrowserShell } from "./browser-shell";
import { cn } from "@/lib/utils";
import { BrowserWithBackgroundLayer } from "./browser-with-background-layer";

type BrowserWithBackgroundProps = {
  children?: ReactNode;
  containerClassName?: string;
  browserClassName?: string;
  contentClassName?: string;
};

export function BrowserWithBackground({
  children,
  containerClassName = "",
  browserClassName = "",
  contentClassName = "",
}: BrowserWithBackgroundProps) {
  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden bg-card/30",
        "min-h-[300px] md:min-h-[400px] lg:min-h-[500px]",
        containerClassName,
      )}
    >
      <BrowserWithBackgroundLayer />
      <div
        className={cn(
          "pointer-events-none relative z-10 flex h-full w-full items-center justify-center overflow-hidden p-4 md:p-12 lg:p-12",
          contentClassName,
        )}
      >
        <div className="relative flex h-full w-full items-center justify-center">
          <BrowserShell
            className={cn("fake-browser-wrapper", browserClassName)}
            contentClassName="bg-card"
          >
            {children}
          </BrowserShell>
        </div>
      </div>
    </div>
  );
}
