import { type Project } from "@/lib/projects-storage";

// Re-export Project type for components
export type { Project } from "@/lib/projects-storage";

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

class ProjectsAPI {
  private baseUrl = "/api/projects";

  // Get all projects for the authenticated user
  async getProjects(): Promise<Project[]> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch projects");
    }
    return response.json();
  }

  // Get a specific project by ID
  async getProject(id: string): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Project not found");
      }
      throw new Error("Failed to fetch project");
    }
    return response.json();
  }

  // Create a new project
  async createProject(data: CreateProjectRequest): Promise<Project> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to create project");
    }

    return response.json();
  }

  // Update a project
  async updateProject(id: string, data: UpdateProjectRequest): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Project not found");
      }
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to update project");
    }

    return response.json();
  }

  // Delete a project
  async deleteProject(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Project not found");
      }
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to delete project");
    }
  }
}

export const projectsAPI = new ProjectsAPI();
