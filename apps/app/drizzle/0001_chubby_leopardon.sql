ALTER TABLE "project" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "spaceId" text;--> statement-breakpoint
CREATE INDEX "project_spaceId_idx" ON "project" USING btree ("spaceId");--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_spaceId_unique" UNIQUE("spaceId");