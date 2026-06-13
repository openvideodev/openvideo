"use client";

import React, { useState, useEffect } from "react";
import { UserMenu } from "@/components/user-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/stores/project-store";
import { toast } from "sonner";

export function ProjectGroupProperty() {
  const { projectName, setProjectName } = useProjectStore();
  const [title, setTitle] = useState(projectName || "Untitled video");

  useEffect(() => {
    setTitle(projectName);
  }, [projectName]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    setProjectName(val);
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Project link copied!");
    }
  };

  return (
    <div className="flex flex-col gap-2 pb-2">
      {/* Top Header: Avatar + Share Button */}
      <div className="flex items-center justify-between">
        <UserMenu />
        <Button
          onClick={handleCopyLink}
          variant="secondary"
          className="h-8 px-4 text-xs font-semibold rounded-lg shadow-none cursor-pointer"
        >
          Share
        </Button>
      </div>

      {/* Project Name Row */}
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={handleTitleChange}
          className="flex-1 h-8 text-xs bg-muted/60 hover:bg-muted/80 border border-border/40 focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:ring-offset-0 focus-visible:border-ring/50 px-3 rounded-lg text-foreground font-semibold shadow-none"
          placeholder="Untitled video"
        />
      </div>
    </div>
  );
}
