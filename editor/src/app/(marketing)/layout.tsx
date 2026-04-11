"use client";

import type { ReactNode } from "react";
import Navbar from "@/components/navbar";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
