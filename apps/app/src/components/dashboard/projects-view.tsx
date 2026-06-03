"use client";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { IconPlus, IconDots, IconTrash, IconFolder } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useProjectsStore } from "@/stores/projects-store";
import type { schema } from "@openvideo/db";

// Infer Space type from the Drizzle schema (matches what tRPC returns)
type Space = typeof schema.space.$inferSelect;
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
import { Input } from "@/components/ui/input";

interface ProjectCardProps {
  project: Space;
  onDelete: (projectId: string) => void;
}

function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const router = useRouter();

  const handleOpen = () => {
    router.push(`/edit/${project.id}`);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div
      className="group relative rounded-lg border border-border/50 bg-card overflow-hidden hover:border-border transition-all cursor-pointer"
      onClick={handleOpen}
    >
      {/* Thumbnail area - square like asset grid */}
      <div className="aspect-square bg-secondary/30 flex items-center justify-center relative">
        <IconFolder className="size-10 text-muted-foreground/40" strokeWidth={1.5} />

        {/* Actions overlay */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="secondary" size="icon" className="size-7 shadow-sm">
                <IconDots className="size-3.5" />
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
                <IconTrash className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="p-2.5 border-t border-border/50">
        <h3 className="font-medium text-sm truncate">{project.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(project.updatedAt)}</p>
      </div>
    </div>
  );
}

export default function ProjectsView() {
  const { isMobile, toggleSidebar } = useSidebar();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // Zustand store
  const projects = useProjectsStore((state) => state.projects);
  const isLoading = useProjectsStore((state) => state.isLoading);
  const isCreating = useProjectsStore((state) => state.isCreating);
  const setProjects = useProjectsStore((state) => state.setProjects);
  const setIsLoading = useProjectsStore((state) => state.setIsLoading);
  const setIsCreating = useProjectsStore((state) => state.setIsCreating);
  const addProject = useProjectsStore((state) => state.addProject);
  const removeProject = useProjectsStore((state) => state.removeProject);

  const { data: spacesData, isLoading: isLoadingSpaces } = trpc.space.list.useQuery();

  useEffect(() => {
    if (spacesData) {
      setProjects(spacesData);
    }
  }, [spacesData, setProjects]);

  useEffect(() => {
    setIsLoading(isLoadingSpaces);
  }, [isLoadingSpaces, setIsLoading]);

  const handleCreateClick = () => {
    setNewProjectName("");
    setCreateDialogOpen(true);
  };

  const createSpace = trpc.space.create.useMutation({
    onSuccess: (newSpace) => {
      addProject(newSpace);
      toast.success("Project created");
      setCreateDialogOpen(false);
      setNewProjectName("");
      setIsCreating(false);
    },
    onError: () => {
      toast.error("Failed to create project");
      setIsCreating(false);
    },
  });

  const confirmCreate = async () => {
    if (isCreating || !newProjectName.trim()) return;
    setIsCreating(true);
    createSpace.mutate({
      name: newProjectName.trim(),
      description: "",
    });
  };

  const handleDeleteProject = (projectId: string) => {
    setProjectToDelete(projectId);
    setDeleteDialogOpen(true);
  };

  const deleteSpace = trpc.space.delete.useMutation({
    onSuccess: () => {
      if (projectToDelete) {
        removeProject(projectToDelete);
        toast.success("Project deleted");
      }
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    },
    onError: () => {
      toast.error("Failed to delete project");
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    },
  });

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    deleteSpace.mutate({ id: projectToDelete });
  };

  return (
    <>
      <main className="min-h-screen bg-card w-full flex flex-col">
        {/* Header - matching editor style */}
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
            <h1 className="text-sm font-semibold">My Projects</h1>
          </div>
          <Button onClick={handleCreateClick} disabled={isCreating} size="sm">
            <IconPlus className="size-4 mr-1.5" />
            New Project
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="p-4 rounded-xl bg-secondary/50 mb-4">
                <IconFolder className="size-8 text-muted-foreground/60" strokeWidth={1.5} />
              </div>
              <h3 className="font-medium mb-1">No projects yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first project to get started
              </p>
              <Button onClick={handleCreateClick} disabled={isCreating} size="sm">
                <IconPlus className="size-4 mr-1.5" />
                Create Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} onDelete={handleDeleteProject} />
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

      {/* Create Project Dialog */}
      <AlertDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create new project</AlertDialogTitle>
            <AlertDialogDescription>Enter a name for your new project.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newProjectName.trim()) {
                confirmCreate();
              }
            }}
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCreateDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCreate}
              disabled={!newProjectName.trim() || isCreating}
            >
              {isCreating ? "Creating..." : "Create Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
