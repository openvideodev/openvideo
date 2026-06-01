CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_token" (
	"id" text PRIMARY KEY NOT NULL,
	"tokenHash" text NOT NULL,
	"tokenHint" text NOT NULL,
	"userId" text NOT NULL,
	"name" text,
	"scopes" text DEFAULT 'all',
	"lastUsed" timestamp,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_token_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "space" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"thumbnail" text,
	"width" integer DEFAULT 1080 NOT NULL,
	"height" integer DEFAULT 1920 NOT NULL,
	"fps" integer DEFAULT 30 NOT NULL,
	"scene" json DEFAULT '{"tracks":[],"clips":{},"settings":{}}'::json NOT NULL,
	"userId" text NOT NULL,
	"orgId" text,
	"data" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset" (
	"id" text PRIMARY KEY NOT NULL,
	"spaceId" text NOT NULL,
	"orgId" text,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"src" text NOT NULL,
	"duration" real,
	"size" integer,
	"width" integer,
	"height" integer,
	"source" text DEFAULT 'upload' NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "asset_transcript" (
	"id" text PRIMARY KEY NOT NULL,
	"assetId" text NOT NULL,
	"spaceId" text NOT NULL,
	"orgId" text,
	"segments" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "asset_transcript_assetId_unique" UNIQUE("assetId")
);
--> statement-breakpoint
CREATE TABLE "asset_visual_timeline" (
	"id" text PRIMARY KEY NOT NULL,
	"assetId" text NOT NULL,
	"spaceId" text NOT NULL,
	"orgId" text,
	"scenes" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "asset_visual_timeline_assetId_unique" UNIQUE("assetId")
);
--> statement-breakpoint
CREATE TABLE "clip_transcript" (
	"id" text PRIMARY KEY NOT NULL,
	"clipId" text NOT NULL,
	"spaceId" text NOT NULL,
	"orgId" text,
	"segments" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clip_transcript_clipId_unique" UNIQUE("clipId")
);
--> statement-breakpoint
CREATE TABLE "upload" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"src" text NOT NULL,
	"size" integer,
	"duration" integer,
	"width" integer,
	"height" integer,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_token" ADD CONSTRAINT "api_token_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "director_session" ADD CONSTRAINT "director_session_spaceId_space_id_fk" FOREIGN KEY ("spaceId") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "director_session" ADD CONSTRAINT "director_session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space" ADD CONSTRAINT "space_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_spaceId_space_id_fk" FOREIGN KEY ("spaceId") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_indexing_status" ADD CONSTRAINT "asset_indexing_status_assetId_asset_id_fk" FOREIGN KEY ("assetId") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_indexing_status" ADD CONSTRAINT "asset_indexing_status_spaceId_space_id_fk" FOREIGN KEY ("spaceId") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transcript" ADD CONSTRAINT "asset_transcript_assetId_asset_id_fk" FOREIGN KEY ("assetId") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transcript" ADD CONSTRAINT "asset_transcript_spaceId_space_id_fk" FOREIGN KEY ("spaceId") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_visual_timeline" ADD CONSTRAINT "asset_visual_timeline_assetId_asset_id_fk" FOREIGN KEY ("assetId") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_visual_timeline" ADD CONSTRAINT "asset_visual_timeline_spaceId_space_id_fk" FOREIGN KEY ("spaceId") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_transcript" ADD CONSTRAINT "clip_transcript_spaceId_space_id_fk" FOREIGN KEY ("spaceId") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload" ADD CONSTRAINT "upload_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "api_token_userId_idx" ON "api_token" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "api_token_hash_idx" ON "api_token" USING btree ("tokenHash");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "director_session_spaceId_userId_idx" ON "director_session" USING btree ("spaceId","userId");--> statement-breakpoint
CREATE INDEX "director_session_orgId_idx" ON "director_session" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "space_userId_idx" ON "space" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "space_orgId_idx" ON "space" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "asset_spaceId_idx" ON "asset" USING btree ("spaceId");--> statement-breakpoint
CREATE INDEX "asset_orgId_idx" ON "asset" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "asset_userId_idx" ON "asset" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "asset_indexing_status_assetId_idx" ON "asset_indexing_status" USING btree ("assetId");--> statement-breakpoint
CREATE INDEX "asset_indexing_status_spaceId_idx" ON "asset_indexing_status" USING btree ("spaceId");--> statement-breakpoint
CREATE INDEX "asset_indexing_status_status_idx" ON "asset_indexing_status" USING btree ("status");--> statement-breakpoint
CREATE INDEX "asset_indexing_status_orgId_idx" ON "asset_indexing_status" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "asset_transcript_assetId_idx" ON "asset_transcript" USING btree ("assetId");--> statement-breakpoint
CREATE INDEX "asset_transcript_spaceId_idx" ON "asset_transcript" USING btree ("spaceId");--> statement-breakpoint
CREATE INDEX "asset_transcript_orgId_idx" ON "asset_transcript" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "asset_visual_timeline_assetId_idx" ON "asset_visual_timeline" USING btree ("assetId");--> statement-breakpoint
CREATE INDEX "asset_visual_timeline_spaceId_idx" ON "asset_visual_timeline" USING btree ("spaceId");--> statement-breakpoint
CREATE INDEX "asset_visual_timeline_orgId_idx" ON "asset_visual_timeline" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "clip_transcript_clipId_idx" ON "clip_transcript" USING btree ("clipId");--> statement-breakpoint
CREATE INDEX "clip_transcript_spaceId_idx" ON "clip_transcript" USING btree ("spaceId");--> statement-breakpoint
CREATE INDEX "clip_transcript_orgId_idx" ON "clip_transcript" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "upload_userId_idx" ON "upload" USING btree ("userId");