import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, integer, json, index, real } from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { space } from "./project.js";

export const asset = pgTable(
  "asset",
  {
    id: text("id").primaryKey(),
    spaceId: text("spaceId")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    orgId: text("orgId"),
    name: text("name").notNull(),
    type: text("type").notNull(), // 'image' | 'video' | 'audio'
    src: text("src").notNull(),
    thumbnailSrc: text("thumbnailSrc"),
    duration: real("duration"), // duration in seconds
    size: integer("size"), // size in bytes
    width: integer("width"),
    height: integer("height"),
    source: text("source").notNull().default("upload"), // 'upload' | 'ai_generated'
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [
    index("asset_spaceId_idx").on(t.spaceId),
    index("asset_orgId_idx").on(t.orgId),
    index("asset_userId_idx").on(t.userId),
  ],
);

export const assetTranscript = pgTable(
  "asset_transcript",
  {
    id: text("id").primaryKey(),
    assetId: text("assetId")
      .notNull()
      .unique()
      .references(() => asset.id, { onDelete: "cascade" }),
    spaceId: text("spaceId")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    orgId: text("orgId"),
    segments: json("segments").$type<any[]>().notNull(), // cached transcript segments {text, startMs, endMs}
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("asset_transcript_assetId_idx").on(t.assetId),
    index("asset_transcript_spaceId_idx").on(t.spaceId),
    index("asset_transcript_orgId_idx").on(t.orgId),
  ],
);

export const assetVisualTimeline = pgTable(
  "asset_visual_timeline",
  {
    id: text("id").primaryKey(),
    assetId: text("assetId")
      .notNull()
      .unique()
      .references(() => asset.id, { onDelete: "cascade" }),
    spaceId: text("spaceId")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    orgId: text("orgId"),
    scenes: json("scenes").$type<any[]>().notNull(), // cached visual scenes {description, startMs, endMs}
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("asset_visual_timeline_assetId_idx").on(t.assetId),
    index("asset_visual_timeline_spaceId_idx").on(t.spaceId),
    index("asset_visual_timeline_orgId_idx").on(t.orgId),
  ],
);

export const assetIndexingStatus = pgTable(
  "asset_indexing_status",
  {
    id: text("id").primaryKey(),
    assetId: text("assetId")
      .notNull()
      .unique()
      .references(() => asset.id, { onDelete: "cascade" }),
    spaceId: text("spaceId")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    orgId: text("orgId"),
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

export const clipTranscript = pgTable(
  "clip_transcript",
  {
    id: text("id").primaryKey(),
    clipId: text("clipId").notNull().unique(),
    spaceId: text("spaceId")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    orgId: text("orgId"),
    segments: json("segments").$type<any[]>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("clip_transcript_clipId_idx").on(t.clipId),
    index("clip_transcript_spaceId_idx").on(t.spaceId),
    index("clip_transcript_orgId_idx").on(t.orgId),
  ],
);

export const upload = pgTable(
  "upload",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(), // 'image' | 'video' | 'audio'
    src: text("src").notNull(), // URL or blob reference
    size: integer("size"), // bytes
    duration: integer("duration"), // seconds for video/audio
    width: integer("width"),
    height: integer("height"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [index("upload_userId_idx").on(t.userId)],
);

export const assetRelations = relations(asset, ({ one, many }) => ({
  space: one(space, {
    fields: [asset.spaceId],
    references: [space.id],
  }),
  user: one(user, {
    fields: [asset.userId],
    references: [user.id],
  }),
  transcript: many(assetTranscript),
  visualTimeline: many(assetVisualTimeline),
  indexingStatus: one(assetIndexingStatus, {
    fields: [asset.id],
    references: [assetIndexingStatus.assetId],
  }),
}));

export const assetIndexingStatusRelations = relations(assetIndexingStatus, ({ one }) => ({
  asset: one(asset, {
    fields: [assetIndexingStatus.assetId],
    references: [asset.id],
  }),
  space: one(space, {
    fields: [assetIndexingStatus.spaceId],
    references: [space.id],
  }),
}));

export const assetTranscriptRelations = relations(assetTranscript, ({ one }) => ({
  asset: one(asset, {
    fields: [assetTranscript.assetId],
    references: [asset.id],
  }),
  space: one(space, {
    fields: [assetTranscript.spaceId],
    references: [space.id],
  }),
}));

export const assetVisualTimelineRelations = relations(assetVisualTimeline, ({ one }) => ({
  asset: one(asset, {
    fields: [assetVisualTimeline.assetId],
    references: [asset.id],
  }),
  space: one(space, {
    fields: [assetVisualTimeline.spaceId],
    references: [space.id],
  }),
}));

export const uploadRelations = relations(upload, ({ one }) => ({
  user: one(user, {
    fields: [upload.userId],
    references: [user.id],
  }),
}));
