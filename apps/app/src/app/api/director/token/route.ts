import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { appRouter, createCallerFactory, createTRPCContext } from "@openvideo/api";

const createCaller = createCallerFactory(appRouter);

/**
 * POST /api/director/token
 *
 * Exchanges the user's browser session for a short-lived Director JWT.
 */
export async function POST(request: NextRequest) {
  // 1. Get spaceId from JSON body or URL query params (if any)
  let spaceId: string | undefined = undefined;
  try {
    const body = await request.clone().json();
    spaceId = body.spaceId;
  } catch {
    // request body might be empty or not json, which is fine
  }

  if (!spaceId) {
    const { searchParams } = new URL(request.url);
    spaceId = searchParams.get("spaceId") || undefined;
  }

  try {
    // 2. Create the tRPC context using the request headers and our auth instance
    const ctx = await createTRPCContext({
      auth,
      req: request,
    });

    // 3. Create the type-safe server caller
    const caller = createCaller(ctx);

    // 4. Call the getToken query procedure in sessionRouter
    const { token } = await caller.session.getToken({ spaceId });

    return NextResponse.json({ token });
  } catch (error: any) {
    console.error("[Token Route] Error generating JWT token:", error);

    // Check if it's a tRPC UNAUTHORIZED error
    const isUnauthorized =
      error?.code === "UNAUTHORIZED" || error?.message?.includes("UNAUTHORIZED");
    const status = isUnauthorized ? 401 : 500;

    return NextResponse.json({ error: error.message || "Token creation failed" }, { status });
  }
}
