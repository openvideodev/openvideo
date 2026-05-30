import type { Auth } from "./server.js";

// Session validation for tRPC and other server contexts
export interface SessionValidationResult {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    emailVerified: boolean;
  } | null;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
  } | null;
}

/**
 * Get session from request headers
 * Use this in tRPC context and API routes
 */
export async function getSessionFromRequest(
  auth: Auth,
  request: Request,
): Promise<SessionValidationResult> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return { user: null, session: null };
  }

  return {
    user: session.user,
    session: {
      id: session.session.id,
      userId: session.session.userId,
      expiresAt: session.session.expiresAt,
      token: session.session.token,
    },
  };
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(session: SessionValidationResult): session is {
  user: NonNullable<SessionValidationResult["user"]>;
  session: NonNullable<SessionValidationResult["session"]>;
} {
  return session.user !== null && session.session !== null;
}

/**
 * Require authentication or throw
 */
export function requireAuth(session: SessionValidationResult): {
  user: NonNullable<SessionValidationResult["user"]>;
  session: NonNullable<SessionValidationResult["session"]>;
} {
  if (!isAuthenticated(session)) {
    throw new Error("Unauthorized");
  }
  return session;
}
