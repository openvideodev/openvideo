import pkg from "pg";
const { Client } = pkg;

const databaseUrl =
  "postgresql://postgres:VQqEUpScxDbiwUrmXRYkYixQkpCUjlTL@kodama.proxy.rlwy.net:57541/railway";

// The full schema SQL derived from drizzle schema definitions
const SQL_STATEMENTS = [
  // api_token table
  `CREATE TABLE IF NOT EXISTS "api_token" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "token_prefix" text NOT NULL,
    "token_hash" text NOT NULL,
    "token_hint" text NOT NULL,
    "scopes" json NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "expires_at" timestamp,
    "last_used_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "api_token_userId_idx" ON "api_token" ("user_id")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "api_token_tokenHash_idx" ON "api_token" ("token_hash")`,

  // director_session table
  `CREATE TABLE IF NOT EXISTS "director_session" (
    "id" text PRIMARY KEY NOT NULL,
    "space_id" text NOT NULL REFERENCES "spaces"("id") ON DELETE CASCADE,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "org_id" text,
    "history_json" json DEFAULT '[]' NOT NULL,
    "pending_plan" json,
    "active_plan_id" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "director_session_spaceId_userId_idx" ON "director_session" ("space_id", "user_id")`,
  `CREATE INDEX IF NOT EXISTS "director_session_orgId_idx" ON "director_session" ("org_id")`,

  // asset table
  `CREATE TABLE IF NOT EXISTS "asset" (
    "id" text PRIMARY KEY NOT NULL,
    "space_id" text NOT NULL REFERENCES "spaces"("id") ON DELETE CASCADE,
    "org_id" text,
    "name" text NOT NULL,
    "type" text NOT NULL,
    "src" text NOT NULL,
    "duration" real,
    "size" integer,
    "width" integer,
    "height" integer,
    "source" text DEFAULT 'upload' NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "asset_spaceId_idx" ON "asset" ("space_id")`,
  `CREATE INDEX IF NOT EXISTS "asset_orgId_idx" ON "asset" ("org_id")`,
  `CREATE INDEX IF NOT EXISTS "asset_userId_idx" ON "asset" ("user_id")`,

  // asset_indexing_status table
  `CREATE TABLE IF NOT EXISTS "asset_indexing_status" (
    "id" text PRIMARY KEY NOT NULL,
    "asset_id" text NOT NULL UNIQUE REFERENCES "asset"("id") ON DELETE CASCADE,
    "space_id" text NOT NULL REFERENCES "spaces"("id") ON DELETE CASCADE,
    "org_id" text,
    "status" text DEFAULT 'pending' NOT NULL,
    "progress" integer DEFAULT 0,
    "stage" text,
    "error" text,
    "job_id" text,
    "started_at" timestamp,
    "completed_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "asset_indexing_status_assetId_idx" ON "asset_indexing_status" ("asset_id")`,
  `CREATE INDEX IF NOT EXISTS "asset_indexing_status_spaceId_idx" ON "asset_indexing_status" ("space_id")`,
  `CREATE INDEX IF NOT EXISTS "asset_indexing_status_status_idx" ON "asset_indexing_status" ("status")`,
  `CREATE INDEX IF NOT EXISTS "asset_indexing_status_orgId_idx" ON "asset_indexing_status" ("org_id")`,

  // asset_transcript table
  `CREATE TABLE IF NOT EXISTS "asset_transcript" (
    "id" text PRIMARY KEY NOT NULL,
    "asset_id" text NOT NULL REFERENCES "asset"("id") ON DELETE CASCADE,
    "space_id" text NOT NULL REFERENCES "spaces"("id") ON DELETE CASCADE,
    "org_id" text,
    "segments" json NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "asset_transcript_assetId_idx" ON "asset_transcript" ("asset_id")`,
  `CREATE INDEX IF NOT EXISTS "asset_transcript_spaceId_idx" ON "asset_transcript" ("space_id")`,
  `CREATE INDEX IF NOT EXISTS "asset_transcript_orgId_idx" ON "asset_transcript" ("org_id")`,

  // asset_visual_timeline table
  `CREATE TABLE IF NOT EXISTS "asset_visual_timeline" (
    "id" text PRIMARY KEY NOT NULL,
    "asset_id" text NOT NULL REFERENCES "asset"("id") ON DELETE CASCADE,
    "space_id" text NOT NULL REFERENCES "spaces"("id") ON DELETE CASCADE,
    "org_id" text,
    "scenes" json NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "asset_visual_timeline_assetId_idx" ON "asset_visual_timeline" ("asset_id")`,
  `CREATE INDEX IF NOT EXISTS "asset_visual_timeline_spaceId_idx" ON "asset_visual_timeline" ("space_id")`,
  `CREATE INDEX IF NOT EXISTS "asset_visual_timeline_orgId_idx" ON "asset_visual_timeline" ("org_id")`,

  // clip_transcript table
  `CREATE TABLE IF NOT EXISTS "clip_transcript" (
    "id" text PRIMARY KEY NOT NULL,
    "clip_id" text NOT NULL UNIQUE,
    "space_id" text NOT NULL REFERENCES "spaces"("id") ON DELETE CASCADE,
    "org_id" text,
    "segments" json NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "clip_transcript_clipId_idx" ON "clip_transcript" ("clip_id")`,
  `CREATE INDEX IF NOT EXISTS "clip_transcript_spaceId_idx" ON "clip_transcript" ("space_id")`,
  `CREATE INDEX IF NOT EXISTS "clip_transcript_orgId_idx" ON "clip_transcript" ("org_id")`,
];

async function run() {
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log("Connected. Applying full schema...\n");

    for (const sql of SQL_STATEMENTS) {
      const label = sql.slice(0, 60).replace(/\n/g, " ").trim();
      try {
        await client.query(sql);
        console.log(`  ✓ ${label}...`);
      } catch (err) {
        console.error(`  ✗ ${label}...\n    Error: ${err.message}`);
      }
    }

    console.log("\n✅ Done!");
  } catch (error) {
    console.error("Connection error:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
