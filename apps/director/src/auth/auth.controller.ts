import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Headers,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { Public } from "./public.decorator";
import { JwtService } from "@nestjs/jwt";
import { DrizzleService } from "../db/drizzle.service";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as bcrypt from "bcrypt";
import { ApiTokenService } from "./api-token.service";
import { Ctx, RequestContext } from "../common/request-context";

interface SignUpDto {
  email: string;
  password: string;
  name?: string;
}

interface SignInDto {
  email: string;
  password: string;
}

interface CreateTokenDto {
  name?: string;
  scopes?: string[];
  expiresInDays?: number; // 30, 60, 90, or null for never
}

@Controller("auth")
export class AuthController {
  constructor(
    private jwtService: JwtService,
    private db: DrizzleService,
    private apiTokenService: ApiTokenService,
  ) {}

  /**
   * Sign up a new user
   */
  @Post("sign-up")
  @Public()
  async signup(@Body() body: SignUpDto) {
    const { email, password, name } = body;

    // Check if user already exists
    const existing = await this.db.db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = nanoid();
    const [user] = await this.db.db
      .insert(schema.user)
      .values({
        id: userId,
        email,
        name: name || email.split("@")[0],
        hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({
        id: schema.user.id,
        email: schema.user.email,
        name: schema.user.name,
        createdAt: schema.user.createdAt,
      });

    // Generate JWT
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Sign in existing user
   */
  @Post("sign-in")
  @Public()
  async signin(@Body() body: SignInDto) {
    const { email, password } = body;

    // Find user
    const [user] = await this.db.db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, email))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // Generate JWT
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Get current user (requires auth)
   */
  @Post("me")
  async me(@Body() body: { token: string }) {
    try {
      const payload = this.jwtService.verify(body.token);
      return {
        user: {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
        },
      };
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }

  // ── API Token Management ────────────────────────────────────────────────────

  /**
   * Exchange API token for JWT (used by CLI/integrations)
   * POST /auth/token/exchange with X-API-Token header
   */
  @Post("token/exchange")
  @Public()
  async exchangeApiToken(@Headers("x-api-token") apiToken: string) {
    if (!apiToken) {
      throw new UnauthorizedException("X-API-Token header required");
    }

    const validation = await this.apiTokenService.validateToken(apiToken);

    if (!validation.valid || !validation.userId) {
      throw new UnauthorizedException(validation.error || "Invalid token");
    }

    // Get user details
    const [user] = await this.db.db
      .select({
        id: schema.user.id,
        email: schema.user.email,
        name: schema.user.name,
      })
      .from(schema.user)
      .where(eq(schema.user.id, validation.userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Generate JWT
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      scopes: validation.scopes,
    };
  }

  /**
   * Create new API token (requires JWT auth)
   * POST /auth/tokens
   */
  @Post("tokens")
  async createToken(@Body() body: CreateTokenDto, @Ctx() ctx: RequestContext) {
    // Calculate expiration
    let expiresAt: Date | undefined;
    if (body.expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + body.expiresInDays);
    }

    const result = await this.apiTokenService.createToken({
      userId: ctx.userId,
      name: body.name,
      scopes: body.scopes || ["all"],
      expiresAt,
    });

    return {
      token: result.fullToken, // Only shown once!
      id: result.id,
      name: result.name,
      hint: result.tokenHint,
      scopes: result.scopes,
      expiresAt: result.expiresAt,
      createdAt: result.createdAt,
    };
  }

  /**
   * List user's API tokens (requires JWT auth)
   * GET /auth/tokens
   */
  @Get("tokens")
  async listTokens(@Ctx() ctx: RequestContext) {
    return this.apiTokenService.listTokens(ctx.userId);
  }

  /**
   * Update API token name (requires JWT auth)
   * PATCH /auth/tokens/:id
   */
  @Patch("tokens/:id")
  async updateToken(
    @Param("id") tokenId: string,
    @Body() body: { name: string },
    @Ctx() ctx: RequestContext,
  ) {
    await this.apiTokenService.updateToken(tokenId, ctx.userId, { name: body.name });
    return { status: "updated" };
  }

  /**
   * Revoke/delete API token (requires JWT auth)
   * DELETE /auth/tokens/:id
   */
  @Delete("tokens/:id")
  async deleteToken(@Param("id") tokenId: string, @Ctx() ctx: RequestContext) {
    await this.apiTokenService.deleteToken(tokenId, ctx.userId);
    return { status: "deleted", id: tokenId };
  }
}
