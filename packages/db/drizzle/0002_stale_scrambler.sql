ALTER TABLE "asset" ADD COLUMN "fps" real;--> statement-breakpoint
ALTER TABLE "asset_indexing_status" ADD COLUMN "processingStatus" text DEFAULT 'pending';