import { NextRequest, NextResponse } from "next/server";
import { OpenVideo } from "@openvideo/ai";
import { auth } from "@/lib/auth";
import { projectsStorage } from "@/lib/projects-storage";

// Server-side OpenVideo instance with API key
const apiKey = process.env.OPENVIDEO_KEY;
const baseURL = process.env.DIRECTOR_URL || "http://localhost:4000";

let serverOpenVideo: OpenVideo | null = null;

function getServerOpenVideo(): OpenVideo {
  if (!serverOpenVideo) {
    if (!apiKey) {
      throw new Error("OPENVIDEO_KEY environment variable is required");
    }
    serverOpenVideo = new OpenVideo({
      mode: "direct",
      apiKey,
      baseURL,
    });
  }
  return serverOpenVideo;
}

// Get authenticated user ID
async function getUserId(request: NextRequest): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user?.id ?? null;
}

// GET /api/projects/[id] - Get a specific project
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    console.log({
      id,
      userId,
    });
    const project = await projectsStorage.getProjectById(id, userId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

// PUT /api/projects/[id] - Update a project
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    // Get the current project before update
    const currentProject = await projectsStorage.getProjectById(id, userId);

    if (!currentProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Update project using storage
    const updatedProject = await projectsStorage.updateProject(id, userId, {
      name: name || currentProject.name,
      description: description !== undefined ? description : currentProject.description,
    });

    if (!updatedProject) {
      return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
    }

    // Also update the corresponding OpenVideo space if name changed
    if (name && name !== currentProject.name) {
      try {
        const openVideo = getServerOpenVideo();
        await openVideo.spaces.update(updatedProject.spaceId, {
          name: `${name} - Space`,
          data: {
            projectType: "editor-project",
            description: description || updatedProject.description || "",
          },
        });
      } catch (spaceError) {
        console.error("Failed to update OpenVideo space:", spaceError);
        // Don't fail the request if space update fails
      }
    }

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const project = await projectsStorage.getProjectById(id, userId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Delete OpenVideo assets and space
    try {
      const openVideo = getServerOpenVideo();

      // Delete all assets in the space (this also cleans up indexes)
      const assets = await openVideo.assets.list({ spaceId: project.spaceId });
      for (const asset of assets) {
        try {
          await openVideo.assets.delete({ spaceId: project.spaceId, assetId: asset.id });
        } catch (assetError) {
          console.error(`Failed to delete asset ${asset.id}:`, assetError);
          // Continue with other assets
        }
      }

      // Delete the space
      await openVideo.spaces.delete(project.spaceId);
    } catch (spaceError) {
      console.error("Failed to delete OpenVideo space/assets:", spaceError);
      // Continue with project deletion even if space deletion fails
    }

    // Remove project from storage
    const deleted = await projectsStorage.deleteProject(id, userId);

    if (!deleted) {
      return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
