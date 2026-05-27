"use client";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { Plus, MoreHorizontal, Trash2, Folder } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { projectsAPI, type Project } from "@/lib/projects-api";
import { getOpenVideoClient } from "@/lib/openvideo-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProjectFile {
  id: string;
  spaceId: string;
  name: string;
  type: "image" | "video" | "audio";
  src: string;
  duration?: number;
  size?: number;
  createdAt: string;
  updatedAt: string;
}

interface ProjectCardProps {
  project: Project;
  files: ProjectFile[];
  onDelete: (projectId: string) => void;
}

function ProjectCard({ project, files, onDelete }: ProjectCardProps) {
  const router = useRouter();

  const handleOpen = () => {
    router.push(`/projects/${project.id}`);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div
      className="group relative bg-card rounded-xl border overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all duration-300 cursor-pointer"
      onClick={handleOpen}
    >
      {/* Thumbnail area */}
      <div className="aspect-video bg-muted flex items-center justify-center relative">
        <div className="p-3 rounded-xl bg-background/80">
          <Folder className="size-8 text-muted-foreground/60" />
        </div>

        {/* Actions overlay */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="secondary" size="icon" className="size-8 shadow-md">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project.id);
                }}
                className="text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-medium text-sm truncate">{project.name}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {files.length} {files.length === 1 ? "file" : "files"} · {formatDate(project.updatedAt)}
        </p>
      </div>
    </div>
  );
}

export default function ProjectsView() {
  const { isMobile, toggleSidebar } = useSidebar();
  const [projects, setProjects] = useState<Project[]>([]);
  const [files, setFiles] = useState<Record<string, ProjectFile[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const projectsData = await projectsAPI.getProjects();
      setProjects(projectsData);

      const filesPromises = projectsData.map(async (project: Project) => {
        try {
          const openVideo = getOpenVideoClient();
          const assets = await openVideo.assets.list({ spaceId: project.spaceId });
          const projectFiles: ProjectFile[] = assets.map((asset: any) => ({
            id: asset.id,
            spaceId: asset.spaceId,
            name: asset.name,
            type: asset.type,
            src: asset.src,
            duration: asset.duration,
            size: asset.size,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt,
          }));
          return { projectId: project.id, files: projectFiles };
        } catch {
          return { projectId: project.id, files: [] };
        }
      });

      const filesResults = await Promise.all(filesPromises);
      const filesMap = filesResults.reduce(
        (acc, result) => {
          acc[result.projectId] = result.files;
          return acc;
        },
        {} as Record<string, ProjectFile[]>,
      );

      setFiles(filesMap);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      await projectsAPI.createProject({ name: "Untitled Project", description: "" });
      toast.success("Project created");
      await loadProjects();
    } catch {
      toast.error("Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = (projectId: string) => {
    setProjectToDelete(projectId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      await projectsAPI.deleteProject(projectToDelete);
      toast.success("Project deleted");
      await loadProjects();
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <>
      <main className="min-h-screen bg-card w-full flex flex-col">
        <div className="h-14 flex items-center p-4 justify-between text-sm font-medium border-b sticky top-0 z-10 bg-card backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isMobile && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleSidebar}
                  className="size-8 -ml-2"
                >
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
              <div>My Projects</div>
            </div>
          </div>
          <Button onClick={handleCreateProject} disabled={isCreating} size="sm">
            <Plus className="size-4 mr-2" />
            New Project
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Folder className="size-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No projects yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Create your first project to get started
              </p>
              <Button onClick={handleCreateProject} disabled={isCreating} size="sm">
                <Plus className="size-4 mr-2" />
                Create Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  files={files[project.id] || []}
                  onDelete={handleDeleteProject}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all its files. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
