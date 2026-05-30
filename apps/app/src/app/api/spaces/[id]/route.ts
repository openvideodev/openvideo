import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as crypto from "crypto";

const DIRECTOR = process.env.DIRECTOR_URL ?? "http://localhost:4000";
const JWT_SECRET = process.env.JWT_SECRET ?? "your-better-auth-secret";

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

type Params = { params: Promise<{ id: string }> };

// ─── GET /api/spaces/[id] ────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const res = await fetch(`${DIRECTOR}/spaces/${id}`, {
      headers: authHeaders(session.user.id, session.user.email, session.user.name ?? ""),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[GET /api/spaces/:id]", error);
    return NextResponse.json({ error: "Failed to fetch space" }, { status: 500 });
  }
}

// ─── PATCH /api/spaces/[id] ──────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const res = await fetch(`${DIRECTOR}/spaces/${id}`, {
      method: "PATCH",
      headers: authHeaders(session.user.id, session.user.email, session.user.name ?? ""),
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[PATCH /api/spaces/:id]", error);
    return NextResponse.json({ error: "Failed to update space" }, { status: 500 });
  }
}

// ─── DELETE /api/spaces/[id] ─────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const res = await fetch(`${DIRECTOR}/spaces/${id}`, {
      method: "DELETE",
      headers: authHeaders(session.user.id, session.user.email, session.user.name ?? ""),
    });

    if (res.status === 204 || res.status === 200) {
      return NextResponse.json({ success: true });
    }
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[DELETE /api/spaces/:id]", error);
    return NextResponse.json({ error: "Failed to delete space" }, { status: 500 });
  }
}
