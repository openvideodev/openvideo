/**
 * OpenVideo SDK Action Endpoint
 *
 * POST /openvideo
 * Body: { action: "spaces:create", params: { name: "Test" } }
 *
 * Server-side SDK executes the action and forwards to Director API.
 */

import { NextRequest, NextResponse } from "next/server";
import { OpenVideo } from "@openvideo/ai";
import { authClient } from "@/lib/auth-client";
import { auth } from "@/lib/auth";

// Server-side SDK instance with API key
const apiKey = process.env.OPENVIDEO_KEY;
const baseURL = process.env.DIRECTOR_URL || "http://localhost:4000";

let openvideo: OpenVideo | null = null;

function getServerOpenVideo(): OpenVideo {
  if (!openvideo) {
    if (!apiKey) {
      throw new Error("OPENVIDEO_KEY environment variable is required");
    }
    openvideo = new OpenVideo({
      apiKey,
      baseURL,
    });
  }
  return openvideo;
}

// Get authenticated user ID
async function getUserId(request: NextRequest): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user?.id ?? null;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse the action request
    const body = await request.json();
    const { action, params } = body;

    console.log({
      action,
      params,
      userId,
      apiKey,
      baseURL,
    });
    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    // 3. Execute via server SDK
    console.log(`[OpenVideo] ${userId} → ${action}`);
    const ov = getServerOpenVideo();

    try {
      const result = await ov.exec({ action, params });
      // Return result (void actions like delete return undefined)
      if (result === undefined) {
        return new NextResponse(null, { status: 204 });
      }
      return NextResponse.json(result);
    } catch (error: any) {
      // Handle 404 for indexes:getStatus - indexing record not created yet
      if (action === "indexes:getStatus" && error.status === 404) {
        return NextResponse.json({ status: "pending" });
      }
      throw error;
    }
  } catch (error: any) {
    console.error("[OpenVideo] Error:", error);

    // Forward SDK errors
    if (error.status) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
