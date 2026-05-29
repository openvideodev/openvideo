import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serverOpenVideo } from "@/lib/server/openvideo";

/**
 * POST /api/director/token
 *
 * Exchanges the user's browser session for a short-lived Director JWT.
 * The API key never leaves the server.
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENVIDEO_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  try {
    const { token } = await serverOpenVideo.tokens.exchange({ apiKey });
    return NextResponse.json({ token });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Token exchange failed" },
      { status: error.status || 500 },
    );
  }
}
