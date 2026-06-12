"use client";

import React, { useState, useEffect } from "react";
import { UserMenu } from "@/components/user-menu";
import { Input } from "@/components/ui/input";
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
        <div className="flex items-center gap-2">
          {/* Split Share Button */}
          <div className="flex items-center bg-white text-black hover:bg-white/90 rounded-lg h-8 border border-white/20 select-none overflow-hidden shrink-0">
            <button
              onClick={handleCopyLink}
              className="px-3 h-full text-xs font-semibold hover:bg-black/5 cursor-pointer transition-colors flex items-center justify-center"
            >
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Project Name & History Row */}
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={handleTitleChange}
          className="flex-1 h-8 text-xs bg-secondary border rounded-md"
          placeholder="Untitled video"
        />
      </div>
    </div>
  );
}
