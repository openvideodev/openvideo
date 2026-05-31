import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as crypto from "crypto";

const DIRECTOR = process.env.DIRECTOR_URL ?? "http://localhost:4000";
const JWT_SECRET = process.env.JWT_SECRET ?? "your-better-auth-secret";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function makeJwt(userId: string, email: string, name: string): string {
  const header = b64url({ alg: "HS256", typ: "JWT" });
  const payload = b64url({
    sub: userId,
    email,
    name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const sig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${header}.${payload}.${sig}`;
}

function authHeaders(userId: string, email: string, name: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${makeJwt(userId, email, name)}`,
  };
}

async function getSession(req: NextRequest) {
  return auth.api.getSession({ headers: req.headers });
}

// ─── GET /api/spaces ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await fetch(`${DIRECTOR}/spaces`, {
      headers: authHeaders(session.user.id, session.user.email, session.user.name ?? ""),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[GET /api/spaces]", error);
    return NextResponse.json({ error: "Failed to fetch spaces" }, { status: 500 });
  }
}

// ─── POST /api/spaces ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description = "", width = 1080, height = 1920, fps = 30 } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const res = await fetch(`${DIRECTOR}/spaces`, {
      method: "POST",
      headers: authHeaders(session.user.id, session.user.email, session.user.name ?? ""),
      body: JSON.stringify({
        name,
        description,
        width,
        height,
        fps,
        scene: { tracks: [], clips: {}, settings: { width, height, fps } },
      }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[POST /api/spaces]", error);
    return NextResponse.json({ error: "Failed to create space" }, { status: 500 });
  }
}
