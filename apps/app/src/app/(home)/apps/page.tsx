"use client";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Play,
  Youtube,
  Figma,
  Link2,
  Cloud,
  Smartphone,
  Search,
  ExternalLink,
  Check,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";

interface AppCardProps {
  icon: React.ReactNode;
  name: string;
  description: string;
  category: string;
  connected?: boolean;
  comingSoon?: boolean;
}

function AppCard({ icon, name, description, category, connected, comingSoon }: AppCardProps) {
  return (
    <div className="group relative rounded-xl border border-border/50 bg-card hover:border-border transition-all duration-200 flex flex-col h-full">
      <div className="p-4 flex-1">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-lg bg-background border border-border/40 flex items-center justify-center shrink-0 shadow-sm">
            {icon}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-sm">{name}</h3>
              {connected && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                  <Check className="size-3" />
                  Connected
                </span>
              )}
              {comingSoon && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
                  Soon
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>
      <div className="px-4 pb-4 mt-auto">
        <Button
          variant={connected ? "outline" : comingSoon ? "ghost" : "secondary"}
          size="sm"
          className="w-full text-xs h-8 font-medium"
          disabled={comingSoon}
        >
          {connected ? (
            <>
              <ExternalLink className="size-3.5 mr-1.5" />
              Manage
            </>
          ) : comingSoon ? (
            "Coming Soon"
          ) : (
            "Connect"
          )}
        </Button>
      </div>
    </div>
  );
}

export default function AppsPage() {
  const { isMobile, toggleSidebar } = useSidebar();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const apps = [
    {
      icon: <Youtube className="size-6 text-red-500" />,
      name: "YouTube",
      description: "Upload directly to YouTube with title, description, and tags.",
      category: "Export",
    },
    {
      icon: <Cloud className="size-6 text-sky-500" />,
      name: "Google Drive",
      description: "Import and export videos directly from Google Drive.",
      category: "Storage",
      connected: false,
    },
    {
      icon: <Cloud className="size-6 text-blue-600" />,
      name: "Dropbox",
      description: "Sync your projects and assets with Dropbox cloud storage.",
      category: "Storage",
    },
    {
      icon: <Figma className="size-6 text-purple-500" />,
      name: "Figma",
      description: "Import designs and prototypes as video assets.",
      category: "Design",
      connected: false,
    },
    {
      icon: <Smartphone className="size-6 text-green-500" />,
      name: "Mobile Upload",
      description: "Wirelessly transfer videos from your phone to the editor.",
      category: "Import",
      comingSoon: true,
    },
    {
      icon: <Link2 className="size-6 text-gray-500" />,
      name: "Loom",
      description: "Import Loom recordings with comments and reactions.",
      category: "Import",
    },
    {
      icon: <Play className="size-6 text-pink-500" />,
      name: "TikTok",
      description: "Export directly to TikTok with optimal format and duration.",
      category: "Export",
    },
    {
      icon: (
        <svg className="size-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.623 4.823-4.351c.192-.192-.054-.3-.297-.108l-5.965 3.759-2.573-.802c-.56-.176-.571-.56.117-.827l10.06-3.883c.467-.174.875.108.795.827z" />
        </svg>
      ),
      name: "Telegram",
      description: "Share videos directly to Telegram channels and chats.",
      category: "Export",
      comingSoon: true,
    },
    {
      icon: (
        <svg className="size-6 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      ),
      name: "OneDrive",
      description: "Store and sync your video projects with Microsoft OneDrive.",
      category: "Storage",
      comingSoon: true,
    },
  ];

  const categories = useMemo(() => {
    const cats = [...new Set(apps.map((a) => a.category))];
    return cats.sort();
  }, [apps]);

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchesSearch =
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || app.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [apps, searchQuery, selectedCategory]);

  return (
    <main className="min-h-screen bg-card w-full flex flex-col">
      {/* Header with Search */}
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
          <h1 className="text-sm font-semibold">Apps</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Filter Bar */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b px-4 py-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Pills Row */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                !selectedCategory
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Apps Grid */}
        <div className="p-4">
          {isLoading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[40vh] text-center">
              <div className="p-4 rounded-xl bg-secondary/50 mb-4">
                <Search className="size-8 text-muted-foreground/60" strokeWidth={1.5} />
              </div>
              <h3 className="font-medium mb-1">No apps found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {filteredApps.map((app) => (
                <AppCard key={app.name} {...app} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
