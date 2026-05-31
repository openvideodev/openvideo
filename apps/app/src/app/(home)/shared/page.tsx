"use client";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { useState, useEffect } from "react";

export default function SharedPage() {
  const { isMobile, toggleSidebar } = useSidebar();
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading for smooth UX
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-card w-full flex flex-col">
      {/* Header - matching projects view style */}
      <div className="h-12 flex items-center px-4 justify-between border-b sticky top-0 z-10 bg-card">
        <div className="flex items-center gap-3">
          {isMobile && (
            <Button size="icon" variant="ghost" onClick={toggleSidebar} className="size-8 -ml-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </Button>
          )}
          <h1 className="text-sm font-semibold">Shared with me</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="p-4 rounded-xl bg-secondary/50 mb-4">
              <Users className="size-8 text-muted-foreground/60" strokeWidth={1.5} />
            </div>
            <h3 className="font-medium mb-1">No shared projects</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Projects shared with you will appear here
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
