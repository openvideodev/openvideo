import type { ReactNode } from "react";
import Navbar from "@/components/navbar";
import { FullWidthBorder } from "@/components/full-width-border";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
