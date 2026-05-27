import { NextRequest, NextResponse } from "next/server";
import { OpenVideo } from "@openvideo/sdk";
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

// GET /api/projects - List all projects for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userProjects = await projectsStorage.getProjectsByUserId(userId);

    return NextResponse.json(userProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Create a space in OpenVideo
    const openVideo = getServerOpenVideo();

    const space = await openVideo.spaces.create({
      name: `${name} - Space`,
      data: {
        projectType: "editor-project",
        description: description || "",
      },
    });

    if (!space || !space.id) {
      throw new Error("Invalid space response from OpenVideo service");
    }

    // Create the project record using storage
    const project = await projectsStorage.createProject({
      name,
      description: description || null,
      spaceId: space.id,
      userId,
      width: 1080,
      height: 1920,
      fps: 30,
      data: {
        tracks: [],
        clips: {},
        settings: {},
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
