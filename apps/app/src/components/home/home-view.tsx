"use client";

import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Brain, Scissors, Video, Users, Image as ImageIcon } from "lucide-react";
import React from "react";
import { toast } from "sonner";

interface ModeCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  disabled?: boolean;
  isCreating?: boolean;
  onClick?: () => void;
  href?: string;
  index: number;
}

function ModeCard({
  title,
  description,
  icon: Icon,
  badge,
  disabled,
  isCreating,
  onClick,
  href,
  index,
}: ModeCardProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
      whileHover={!disabled ? { y: -2 } : undefined}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col p-6 h-full bg-card border border-border rounded-sm transition-all duration-300",
        !disabled
          ? "hover:border-primary/50 cursor-pointer shadow-sm hover:shadow-md"
          : "opacity-50 cursor-not-allowed",
        isCreating && "opacity-50 pointer-events-none",
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "p-3 rounded-lg bg-muted border border-border text-foreground group-hover:scale-105 transition-transform duration-300",
            disabled && "grayscale",
          )}
        >
          <Icon className="size-5" />
        </div>
        {badge && (
          <span className="px-2 py-0.5 text-[0.625rem] uppercase font-black tracking-widest bg-primary text-primary-foreground rounded-full">
            {badge}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-auto">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {isCreating ? "Creating project..." : description}
        </p>
      </div>
    </motion.div>
  );

  if (disabled || onClick) return content;

  return (
    <Link href={href || "#"} className="h-full block">
      {content}
    </Link>
  );
}

export default function HomeView() {
  const router = useRouter();
  const { isMobile, toggleSidebar } = useSidebar();
  const [isCreating, setIsCreating] = React.useState<string | null>(null);
  const [isViralDialogOpen, setIsViralDialogOpen] = React.useState(false);

  const handleCreateProject = async (type: string) => {
    setIsCreating(type);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Untitled Project",
          type: type,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      if (type === "ai-editor") {
        const { project, schemaId } = await response.json();
        if (project.generationId) {
          router.push(`/storyboard/${project.generationId}`);
        } else {
          router.push(`/edit/${project.generationId}`);
        }
      }
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project. Please try again.");
      setIsCreating(null);
    }
  };

  return (
    <main className="w-full min-h-screen bg-card transition-colors duration-500 overflow-x-hidden">
      <div className="h-14 flex items-center p-4 justify-between text-sm font-medium border-b sticky top-0 z-10 bg-card backdrop-blur-md">
        <div className="flex items-center gap-2">
          {isMobile && (
            <Button className="rounded-full" size="icon" variant="ghost" onClick={toggleSidebar}>
              <Icons.menu className="size-5" />
            </Button>
          )}
          Home
        </div>
      </div>
      <div
        className={cn(
          "max-w-300 mx-auto transition-all duration-500 p-6 lg:p-8 flex flex-col gap-10",
        )}
      >
        <section>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-center gap-2 mb-4"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
            <h2 className="text-sm font-medium text-foreground">Video Generation</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
            <ModeCard
              index={4}
              title="Product Image Ads"
              description="Generate dynamic, fast-pacing promo videos from your product image assets."
              icon={ImageIcon}
              href="/script-to-video?mode=product-image-ad"
            />
            <ModeCard
              index={3}
              title="Product Video Ads"
              description="Generate high-converting promo videos from your product assets and descriptions."
              icon={Scissors}
              href="/script-to-video?mode=product-video-ad"
            />

            <ModeCard
              index={0}
              title="UGC Video Ads"
              description="Create authentic user-style ads with AI avatars interacting with your product."
              icon={Video}
              href="/script-to-video?mode=ugc-video-ad"
            />

            <ModeCard
              index={2}
              title="Fake UGC Ads"
              description="High-converting AI-generated UGC style ads using lifestyle visuals and avatars."
              icon={Sparkles}
              href="/script-to-video?mode=fake-ugc-video-ad"
            />

            <ModeCard
              index={1}
              title="Character-Driven Ad"
              description="Generate multi-character ads with native lip-sync and cinematic consistency."
              icon={Users}
              href="/script-to-video?mode=character-driven-ad"
            />

            {/* <ModeCard
              index={5}
              title="AI Narrative Video"
              description="Transform scripts into creative storytelling, motivational, or educational videos."
              icon={Brain}
              href="/script-to-video?mode=narrative-video"
            /> */}
          </div>
        </section>
        {/*
        <section>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 6 * 0.05, duration: 0.4, ease: "easeOut" }}
            className="flex items-center gap-2 mb-4"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
            <h2 className="text-sm font-medium text-foreground">Pro Tools</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
            <ModeCard
              index={7}
              title="AI Editor"
              description="Professional video editing app powered by AI tools."
              icon={Scissors}
              isCreating={isCreating === "ai-editor"}
              onClick={() => handleCreateProject("ai-editor")}
            />
          </div>
        </section> */}

        <section>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 8 * 0.05, duration: 0.4, ease: "easeOut" }}
            className="flex items-center gap-2 mb-4"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
            <h2 className="text-sm font-medium text-foreground">Clone Videos</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
            <ModeCard
              index={9}
              title="Clone Videos"
              description="Finds good videos and clones it with minimal edits."
              icon={Sparkles}
              isCreating={isCreating === "viral-videos"}
              onClick={() => setIsViralDialogOpen(true)}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
