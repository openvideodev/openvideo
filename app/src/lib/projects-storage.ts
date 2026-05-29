import { db } from "@/lib/db";
import { project } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// Database-backed project storage
export type Project = InferSelectModel<typeof project>;
export type CreateProject = Omit<
  InferInsertModel<typeof project>,
  "id" | "createdAt" | "updatedAt"
>;

class ProjectsStorage {
  // Get all projects for a user
  async getProjectsByUserId(userId: string): Promise<Project[]> {
    const projects = await db
      .select()
      .from(project)
      .where(eq(project.userId, userId))
      .orderBy(project.updatedAt);

    return projects;
  }

  // Get a specific project by ID and user
  async getProjectById(id: string, userId: string): Promise<Project | null> {
    const [projectRecord] = await db
      .select()
      .from(project)
      .where(and(eq(project.id, id), eq(project.userId, userId)));

    return projectRecord || null;
  }

  // Create a new project
  async createProject(projectData: CreateProject): Promise<Project> {
    const newProject = {
      ...projectData,
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [createdProject] = await db.insert(project).values(newProject).returning();

    return createdProject;
  }

  // Update a project
  async updateProject(
    id: string,
    userId: string,
    updates: Partial<Pick<Project, "name" | "description">>,
  ): Promise<Project | null> {
    const [updatedProject] = await db
      .update(project)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(project.id, id), eq(project.userId, userId)))
      .returning();

    return updatedProject || null;
  }

  // Delete a project
  async deleteProject(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(project)
      .where(and(eq(project.id, id), eq(project.userId, userId)));

    return (result.rowCount ?? 0) > 0;
  }

  // Get all projects (for debugging)
  async getAllProjects(): Promise<Project[]> {
    const projects = await db.select().from(project);
    return projects;
  }

  // Clear all projects (for testing)
  async clearAllProjects(): Promise<void> {
    await db.delete(project);
  }
}

// Singleton instance
export const projectsStorage = new ProjectsStorage();
