import { Injectable, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { setRequestContext, RequestContext } from "../common/request-context";
import { ApiTokenService } from "./api-token.service";

@Injectable()
export class JwtGuard extends AuthGuard("jwt") {
  constructor(private apiTokenService?: ApiTokenService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // Allow bypass in development mode - still populate context
    if (process.env.NODE_ENV === "development") {
      const devUser = { userId: "dev_user", sessionToken: "dev_session" };
      req.user = devUser;
      setRequestContext(req, {
        userId: devUser.userId,
        authType: "dev",
      });
      return true;
    }

    // Check for API token in header
    const apiToken = req.headers["x-api-token"];
    if (apiToken && this.apiTokenService) {
      const validation = await this.apiTokenService.validateToken(apiToken);

      if (validation.valid && validation.userId) {
        req.user = { userId: validation.userId, scopes: validation.scopes };
        setRequestContext(req, {
          userId: validation.userId,
          authType: "api-token",
          scopes: validation.scopes,
        });
        return true;
      }
    }

    // Fall back to JWT authentication
    try {
      const result = await super.canActivate(context);
      return result as boolean;
    } catch {
      return false;
    }
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (process.env.NODE_ENV === "development") {
      const devContext: RequestContext = {
        userId: "dev_user",
        authType: "dev",
      };
      const req = context.switchToHttp().getRequest();
      setRequestContext(req, devContext);
      return { userId: "dev_user", sessionToken: "dev_session" };
    }

    // Check if already authenticated via API token
    const req = context.switchToHttp().getRequest();
    if (req.user && req.user.userId) {
      return req.user;
    }

    if (err || !user) {
      throw err || new UnauthorizedException("Invalid or missing authentication token");
    }

    // Populate RequestContext for downstream use
    setRequestContext(req, {
      userId: user.userId,
      orgId: user.orgId,
      authType: "jwt",
      scopes: user.scopes,
    });

    return user;
  }
}
