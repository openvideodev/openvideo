-- Unified initial migration — all tables with orgId support

-- ── user ──────────────────────────────────────────────────────────────────────
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"hashedPassword" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE UNIQUE INDEX "user_email_idx" ON "user" USING btree ("email");
--> statement-breakpoint

-- ── api_token ─────────────────────────────────────────────────────────────────
CREATE TABLE "api_token" (
	"id" text PRIMARY KEY NOT NULL,
	"tokenHash" text NOT NULL UNIQUE,
	"tokenHint" text NOT NULL,
	"userId" text NOT NULL,
	"name" text,
	"scopes" json DEFAULT '["all"]'::json NOT NULL,
	"lastUsed" timestamp,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE UNIQUE INDEX "api_token_hash_idx" ON "api_token" USING btree ("tokenHash");
--> statement-breakpoint
CREATE INDEX "api_token_userId_idx" ON "api_token" USING btree ("userId");
--> statement-breakpoint

-- ── space ─────────────────────────────────────────────────────────────────────
CREATE TABLE "space" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"userId" text NOT NULL,
	"orgId" text,
	"data" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ── director_session ────────────────────────────────────────────────────────────
CREATE TABLE "director_session" (
	"id" text PRIMARY KEY NOT NULL,
	"spaceId" text NOT NULL,
	"userId" text NOT NULL,
	"orgId" text,
	"historyJson" json DEFAULT '[]'::json NOT NULL,
	"pendingPlan" json,
	"activePlanId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ── clip_transcript ─────────────────────────────────────────────────────────────
CREATE TABLE "clip_transcript" (
	"id" text PRIMARY KEY NOT NULL,
	"clipId" text NOT NULL,
	"spaceId" text NOT NULL,
	"orgId" text,
	"segments" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ── asset ───────────────────────────────────────────────────────────────────────
CREATE TABLE "asset" (
	"id" text PRIMARY KEY NOT NULL,
	"spaceId" text NOT NULL,
	"orgId" text,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"src" text NOT NULL,
	"duration" real,
	"size" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ── asset_transcript ────────────────────────────────────────────────────────────
CREATE TABLE "asset_transcript" (
	"id" text PRIMARY KEY NOT NULL,
	"assetId" text NOT NULL,
	"spaceId" text NOT NULL,
	"orgId" text,
	"segments" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ── asset_visual_timeline ───────────────────────────────────────────────────────
CREATE TABLE "asset_visual_timeline" (
	"id" text PRIMARY KEY NOT NULL,
	"assetId" text NOT NULL,
	"spaceId" text NOT NULL,
	"orgId" text,
	"scenes" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ── asset_indexing_status ───────────────────────────────────────────────────────
CREATE TABLE "asset_indexing_status" (
	"id" text PRIMARY KEY NOT NULL,
	"assetId" text NOT NULL,
	"spaceId" text NOT NULL,
	"orgId" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0,
	"stage" text,
	"error" text,
	"jobId" text,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "asset_indexing_status_assetId_unique" UNIQUE("assetId")
);
--> statement-breakpoint

-- ── indexes ──────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX "clip_transcript_clipId_idx" ON "clip_transcript" USING btree ("clipId");
--> statement-breakpoint
CREATE INDEX "clip_transcript_spaceId_idx" ON "clip_transcript" USING btree ("spaceId");
--> statement-breakpoint
CREATE INDEX "clip_transcript_orgId_idx" ON "clip_transcript" USING btree ("orgId");
--> statement-breakpoint
CREATE INDEX "director_session_spaceId_userId_idx" ON "director_session" USING btree ("spaceId","userId");
--> statement-breakpoint
CREATE INDEX "director_session_orgId_idx" ON "director_session" USING btree ("orgId");
--> statement-breakpoint
CREATE INDEX "space_userId_idx" ON "space" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX "space_orgId_idx" ON "space" USING btree ("orgId");
--> statement-breakpoint
CREATE INDEX "asset_spaceId_idx" ON "asset" USING btree ("spaceId");
--> statement-breakpoint
CREATE INDEX "asset_orgId_idx" ON "asset" USING btree ("orgId");
--> statement-breakpoint
CREATE UNIQUE INDEX "asset_transcript_assetId_idx" ON "asset_transcript" USING btree ("assetId");
--> statement-breakpoint
CREATE INDEX "asset_transcript_spaceId_idx" ON "asset_transcript" USING btree ("spaceId");
--> statement-breakpoint
CREATE INDEX "asset_transcript_orgId_idx" ON "asset_transcript" USING btree ("orgId");
--> statement-breakpoint
CREATE UNIQUE INDEX "asset_visual_timeline_assetId_idx" ON "asset_visual_timeline" USING btree ("assetId");
--> statement-breakpoint
CREATE INDEX "asset_visual_timeline_spaceId_idx" ON "asset_visual_timeline" USING btree ("spaceId");
--> statement-breakpoint
CREATE INDEX "asset_visual_timeline_orgId_idx" ON "asset_visual_timeline" USING btree ("orgId");
--> statement-breakpoint
CREATE INDEX "asset_indexing_status_assetId_idx" ON "asset_indexing_status" USING btree ("assetId");
--> statement-breakpoint
CREATE INDEX "asset_indexing_status_spaceId_idx" ON "asset_indexing_status" USING btree ("spaceId");
--> statement-breakpoint
CREATE INDEX "asset_indexing_status_status_idx" ON "asset_indexing_status" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "asset_indexing_status_orgId_idx" ON "asset_indexing_status" USING btree ("orgId");
