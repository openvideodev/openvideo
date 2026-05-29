/**
 * Request Context - carries user/org info through the request lifecycle
 *
 * This prepares the codebase for multi-tenancy without implementing auth yet.
 * Currently extracts mock data from JWT or creates a default context.
 * Future: will carry API key derived context for external integrations.
 */

import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface RequestContext {
  userId: string;
  orgId?: string; // Optional: populated when multi-tenancy is enabled
  authType: "jwt" | "api-key" | "api-token" | "dev";
  scopes?: string[]; // Optional: for API key scoped access
}

/**
 * Parameter decorator to inject RequestContext into controllers
 *
 * Usage:
 *   @Get()
 *   async list(@Ctx() ctx: RequestContext) {
 *     return this.service.findAll(ctx);
 *   }
 */
export const Ctx = createParamDecorator((data: unknown, ctx: ExecutionContext): RequestContext => {
  const request = ctx.switchToHttp().getRequest();

  // Return existing context if already set by guard
  if (request.requestContext) {
    return request.requestContext;
  }

  // Fallback: create from JWT user or dev mock
  const user = request.user;
  if (user) {
    return {
      userId: user.userId || user.sub || user.id || "unknown",
      orgId: user.orgId,
      authType: user.authType || "jwt",
      scopes: user.scopes,
    };
  }

  // Dev fallback (when no auth)
  return {
    userId: "dev_user",
    authType: "dev",
  };
});

/**
 * Set context on request (called by auth guards)
 */
export function setRequestContext(request: any, context: RequestContext): void {
  request.requestContext = context;
}
