import {
  pgTable,
  text,
  json,
  timestamp,
  index,
  uniqueIndex,
  real,
  integer,
} from "drizzle-orm/pg-core";

// ── user ──────────────────────────────────────────────────────────────────────
export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    hashedPassword: text("hashedPassword").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("user_email_idx").on(t.email)],
);

// ── api_token ─────────────────────────────────────────────────────────────────
export const apiToken = pgTable(
  "api_token",
  {
    id: text("id").primaryKey(),
    tokenHash: text("tokenHash").notNull().unique(), // SHA-256 hash of full token
    tokenHint: text("tokenHint").notNull(), // Last 4 chars for display: "...ABC"
    userId: text("userId").notNull(),
    name: text("name"), // "Production", "CI/CD"
    scopes: json("scopes").$type<string[]>().default(["all"]),
    lastUsed: timestamp("lastUsed"),
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("api_token_hash_idx").on(t.tokenHash),
    index("api_token_userId_idx").on(t.userId),
  ],
);

// ── space ─────────────────────────────────────────────────────────────────────
export const space = pgTable(
  "space",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    userId: text("userId").notNull(),
    orgId: text("orgId"), // Optional: for future multi-tenancy
    data: json("data").$type<any>().notNull(), // Stores the entire IProject snapshot
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [index("space_userId_idx").on(t.userId), index("space_orgId_idx").on(t.orgId)],
);

// ── director_session ────────────────────────────────────────────────────────────
export const directorSession = pgTable(
  "director_session",
  {
    id: text("id").primaryKey(),
    spaceId: text("spaceId").notNull(),
    userId: text("userId").notNull(),
    orgId: text("orgId"), // Optional: for future multi-tenancy
    historyJson: json("historyJson").$type<any[]>().notNull().default([]),
    pendingPlan: json("pendingPlan").$type<any>(),
    activePlanId: text("activePlanId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [
    index("director_session_spaceId_userId_idx").on(t.spaceId, t.userId),
    index("director_session_orgId_idx").on(t.orgId),
  ],
);

// ── clip_transcript ─────────────────────────────────────────────────────────────
export const clipTranscript = pgTable(
  "clip_transcript",
  {
    id: text("id").primaryKey(),
    clipId: text("clipId").notNull(),
    spaceId: text("spaceId").notNull(),
    orgId: text("orgId"), // Optional: for future multi-tenancy
    segments: json("segments").$type<any[]>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("clip_transcript_clipId_idx").on(t.clipId),
    index("clip_transcript_spaceId_idx").on(t.spaceId),
    index("clip_transcript_orgId_idx").on(t.orgId),
  ],
);

// ── asset ──────────────────────────────────────────────────────────────────────
export const asset = pgTable(
  "asset",
  {
    id: text("id").primaryKey(),
    spaceId: text("spaceId").notNull(),
    orgId: text("orgId"), // Optional: for future multi-tenancy
    name: text("name").notNull(),
    type: text("type").notNull(), // 'image' | 'video' | 'audio'
    src: text("src").notNull(),
    duration: real("duration"), // duration in seconds
    size: integer("size"), // size in bytes
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [index("asset_spaceId_idx").on(t.spaceId), index("asset_orgId_idx").on(t.orgId)],
);

// ── asset_transcript ───────────────────────────────────────────────────────────
export const assetTranscript = pgTable(
  "asset_transcript",
  {
    id: text("id").primaryKey(),
    assetId: text("assetId").notNull(),
    spaceId: text("spaceId").notNull(),
    orgId: text("orgId"), // Optional: for future multi-tenancy
    segments: json("segments").$type<any[]>().notNull(), // cached transcript segments {text, startMs, endMs}
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("asset_transcript_assetId_idx").on(t.assetId),
    index("asset_transcript_spaceId_idx").on(t.spaceId),
    index("asset_transcript_orgId_idx").on(t.orgId),
  ],
);

// ── asset_visual_timeline ─────────────────────────────────────────────────────
export const assetVisualTimeline = pgTable(
  "asset_visual_timeline",
  {
    id: text("id").primaryKey(),
    assetId: text("assetId").notNull(),
    spaceId: text("spaceId").notNull(),
    orgId: text("orgId"), // Optional: for future multi-tenancy
    scenes: json("scenes").$type<any[]>().notNull(), // cached visual scenes {description, startMs, endMs}
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("asset_visual_timeline_assetId_idx").on(t.assetId),
    index("asset_visual_timeline_spaceId_idx").on(t.spaceId),
    index("asset_visual_timeline_orgId_idx").on(t.orgId),
  ],
);

// ── asset_indexing_status ──────────────────────────────────────────────────────
export const assetIndexingStatus = pgTable(
  "asset_indexing_status",
  {
    id: text("id").primaryKey(),
    assetId: text("assetId").notNull().unique(),
    spaceId: text("spaceId").notNull(),
    orgId: text("orgId"), // Optional: for future multi-tenancy
    status: text("status").notNull().default("pending"), // 'pending' | 'processing' | 'completed' | 'failed'
    progress: integer("progress").default(0), // 0-100 percentage
    stage: text("stage"), // 'downloading' | 'transcribing' | 'embedding' | 'storing'
    error: text("error"), // Error message if failed
    jobId: text("jobId"), // BullMQ job ID for tracking
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [
    index("asset_indexing_status_assetId_idx").on(t.assetId),
    index("asset_indexing_status_spaceId_idx").on(t.spaceId),
    index("asset_indexing_status_status_idx").on(t.status),
    index("asset_indexing_status_orgId_idx").on(t.orgId),
  ],
);

// ── project ───────────────────────────────────────────────────────────────────
export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"), // Optional description
    spaceId: text("spaceId").unique(), // References OpenVideo space
    thumbnail: text("thumbnail"),
    width: integer("width").default(1080).notNull(),
    height: integer("height").default(1920).notNull(),
    fps: integer("fps").default(30).notNull(),
    // Full project JSON: tracks, clips, settings, etc.
    data: json("data")
      .$type<{
        tracks: any[];
        clips: Record<string, any>;
        settings?: any;
      }>()
      .notNull(),
    userId: text("userId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [index("project_userId_idx").on(t.userId), index("project_spaceId_idx").on(t.spaceId)],
);
