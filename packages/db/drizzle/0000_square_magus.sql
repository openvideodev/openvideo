CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_token" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"token_hint" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text,
	"scopes" text[] DEFAULT '{"all"}',
	"last_used" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_token_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "director_session" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text,
	"history_json" json DEFAULT '[]'::json NOT NULL,
	"pending_plan" json,
	"active_plan_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"thumbnail" text,
	"width" integer DEFAULT 1080 NOT NULL,
	"height" integer DEFAULT 1920 NOT NULL,
	"fps" integer DEFAULT 30 NOT NULL,
	"scene" json DEFAULT '{"tracks":[],"clips":{},"settings":{}}'::json NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text,
	"data" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"org_id" text,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"src" text NOT NULL,
	"duration" real,
	"size" integer,
	"width" integer,
	"height" integer,
	"source" text DEFAULT 'upload' NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_indexing_status" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"space_id" text NOT NULL,
	"org_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0,
	"stage" text,
	"error" text,
	"job_id" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "asset_indexing_status_asset_id_unique" UNIQUE("asset_id")
);
--> statement-breakpoint
CREATE TABLE "asset_transcript" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"space_id" text NOT NULL,
	"org_id" text,
	"segments" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_visual_timeline" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"space_id" text NOT NULL,
	"org_id" text,
	"scenes" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clip_transcript" (
	"id" text PRIMARY KEY NOT NULL,
	"clip_id" text NOT NULL,
	"space_id" text NOT NULL,
	"org_id" text,
	"segments" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clip_transcript_clip_id_unique" UNIQUE("clip_id")
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
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_token" ADD CONSTRAINT "api_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "director_session" ADD CONSTRAINT "director_session_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "director_session" ADD CONSTRAINT "director_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_indexing_status" ADD CONSTRAINT "asset_indexing_status_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_indexing_status" ADD CONSTRAINT "asset_indexing_status_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transcript" ADD CONSTRAINT "asset_transcript_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transcript" ADD CONSTRAINT "asset_transcript_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_visual_timeline" ADD CONSTRAINT "asset_visual_timeline_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_visual_timeline" ADD CONSTRAINT "asset_visual_timeline_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_transcript" ADD CONSTRAINT "clip_transcript_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload" ADD CONSTRAINT "upload_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_token_userId_idx" ON "api_token" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_token_hash_idx" ON "api_token" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "director_session_spaceId_userId_idx" ON "director_session" USING btree ("space_id","user_id");--> statement-breakpoint
CREATE INDEX "director_session_orgId_idx" ON "director_session" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "space_userId_idx" ON "spaces" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "space_orgId_idx" ON "spaces" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "asset_spaceId_idx" ON "asset" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "asset_orgId_idx" ON "asset" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "asset_userId_idx" ON "asset" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "asset_indexing_status_assetId_idx" ON "asset_indexing_status" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_indexing_status_spaceId_idx" ON "asset_indexing_status" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "asset_indexing_status_status_idx" ON "asset_indexing_status" USING btree ("status");--> statement-breakpoint
CREATE INDEX "asset_indexing_status_orgId_idx" ON "asset_indexing_status" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "asset_transcript_assetId_idx" ON "asset_transcript" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_transcript_spaceId_idx" ON "asset_transcript" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "asset_transcript_orgId_idx" ON "asset_transcript" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "asset_visual_timeline_assetId_idx" ON "asset_visual_timeline" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_visual_timeline_spaceId_idx" ON "asset_visual_timeline" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "asset_visual_timeline_orgId_idx" ON "asset_visual_timeline" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "clip_transcript_clipId_idx" ON "clip_transcript" USING btree ("clip_id");--> statement-breakpoint
CREATE INDEX "clip_transcript_spaceId_idx" ON "clip_transcript" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "clip_transcript_orgId_idx" ON "clip_transcript" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "upload_userId_idx" ON "upload" USING btree ("user_id");