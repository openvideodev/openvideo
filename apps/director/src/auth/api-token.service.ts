import { getDB, schema, eq, and, isNull, gt } from "@openvideo/db";
const db = getDB();

import { Injectable, Logger } from "@nestjs/common";
import { nanoid } from "nanoid";
import * as crypto from "crypto";

export interface CreateTokenDto {
  userId: string;
  name?: string;
  scopes?: string[];
  expiresAt?: Date;
}

export interface TokenResponse {
  id: string;
  name: string | null;
  tokenHint: string;
  scopes: string[];
  lastUsed: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface TokenWithFullToken extends TokenResponse {
  fullToken: string; // Only returned once on creation
}

export interface TokenValidationResult {
  valid: boolean;
  userId?: string;
  scopes?: string[];
  error?: string;
}

@Injectable()
export class ApiTokenService {
  private readonly logger = new Logger(ApiTokenService.name);
  private readonly TOKEN_PREFIX = "ov_live_";
  private readonly TOKEN_LENGTH = 24;

  /**
   * Generate a new API token
   * Format: ov_live_xxxxxxxxxxxxxxxxxxxxxxxx (32 chars total)
   */
  async createToken(dto: CreateTokenDto): Promise<TokenWithFullToken> {
    const id = nanoid();

    // Generate token: ov_live_ + 24 random chars
    const randomPart = nanoid(this.TOKEN_LENGTH);
    const fullToken = `${this.TOKEN_PREFIX}${randomPart}`;

    // Hash for storage (security)
    const tokenHash = crypto.createHash("sha256").update(fullToken).digest("hex");

    // Hint for display (last 4 chars)
    const tokenHint = `...${randomPart.slice(-4)}`;

    const [row] = await db
      .insert(schema.apiToken)
      .values({
        id,
        tokenHash,
        tokenHint,
        userId: dto.userId,
        name: dto.name || null,
        scopes: dto.scopes || ["all"],
        expiresAt: dto.expiresAt || null,
      })
      .returning({
        id: schema.apiToken.id,
        name: schema.apiToken.name,
        tokenHint: schema.apiToken.tokenHint,
        scopes: schema.apiToken.scopes,
        lastUsed: schema.apiToken.lastUsed,
        expiresAt: schema.apiToken.expiresAt,
        createdAt: schema.apiToken.createdAt,
      });

    this.logger.log(`Created API token ${id} for user ${dto.userId}`);

    return {
      ...row,
      scopes: row.scopes as string[],
      fullToken, // Only returned once!
    };
  }

  /**
   * Validate an API token
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    // Check format
    if (!token.startsWith(this.TOKEN_PREFIX)) {
      return { valid: false, error: "Invalid token format" };
    }

    // Hash the provided token
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Look up in database
    const [record] = await db
      .select()
      .from(schema.apiToken)
      .where(eq(schema.apiToken.tokenHash, tokenHash))
      .limit(1);

    if (!record) {
      return { valid: false, error: "Token not found" };
    }

    // Check expiration
    if (record.expiresAt && new Date() > record.expiresAt) {
      return { valid: false, error: "Token expired" };
    }

    // Update last used
    await db
      .update(schema.apiToken)
      .set({ lastUsed: new Date() })
      .where(eq(schema.apiToken.id, record.id));

    return {
      valid: true,
      userId: record.userId,
      scopes: record.scopes as string[],
    };
  }

  /**
   * List all tokens for a user (without full tokens)
   */
  async listTokens(userId: string): Promise<TokenResponse[]> {
    const rows = await db
      .select({
        id: schema.apiToken.id,
        name: schema.apiToken.name,
        tokenHint: schema.apiToken.tokenHint,
        scopes: schema.apiToken.scopes,
        lastUsed: schema.apiToken.lastUsed,
        expiresAt: schema.apiToken.expiresAt,
        createdAt: schema.apiToken.createdAt,
      })
      .from(schema.apiToken)
      .where(
        and(
          eq(schema.apiToken.userId, userId),
          // Only show non-expired or tokens expired within last 30 days
          isNull(schema.apiToken.expiresAt),
        ),
      )
      .orderBy(schema.apiToken.createdAt);

    return rows.map((r) => ({
      ...r,
      scopes: r.scopes as string[],
    }));
  }

  /**
   * Delete/revoke a token
   */
  async deleteToken(tokenId: string, userId: string): Promise<void> {
    const result = await db
      .delete(schema.apiToken)
      .where(and(eq(schema.apiToken.id, tokenId), eq(schema.apiToken.userId, userId)))
      .returning();

    if (result.length === 0) {
      throw new Error("Token not found or not owned by user");
    }

    this.logger.log(`Deleted API token ${tokenId}`);
  }

  /**
   * Update token name
   */
  async updateToken(tokenId: string, userId: string, updates: { name?: string }): Promise<void> {
    const result = await db
      .update(schema.apiToken)
      .set({ name: updates.name })
      .where(and(eq(schema.apiToken.id, tokenId), eq(schema.apiToken.userId, userId)))
      .returning();

    if (result.length === 0) {
      throw new Error("Token not found or not owned by user");
    }
  }
}
