CREATE TABLE "clip_transcript" (
	"id" text PRIMARY KEY NOT NULL,
	"clipId" text NOT NULL,
	"projectId" text NOT NULL,
	"segments" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "director_session" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"userId" text NOT NULL,
	"historyJson" json DEFAULT '[]'::json NOT NULL,
	"pendingPlan" json,
	"activePlanId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"userId" text NOT NULL,
	"data" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "clip_transcript_clipId_idx" ON "clip_transcript" USING btree ("clipId");--> statement-breakpoint
CREATE INDEX "clip_transcript_projectId_idx" ON "clip_transcript" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "director_session_projectId_userId_idx" ON "director_session" USING btree ("projectId","userId");--> statement-breakpoint
CREATE INDEX "project_userId_idx" ON "project" USING btree ("userId");