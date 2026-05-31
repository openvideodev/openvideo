// Re-export better-auth generated schema
export * from "./auth-schema";

// App-specific tables
import { pgTable, text, timestamp, integer, json, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth-schema";

// ── upload ────────────────────────────────────────────────────────────────────
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

// ── Relations ─────────────────────────────────────────────────────────────────
export const uploadRelations = relations(upload, ({ one }) => ({
  user: one(user, {
    fields: [upload.userId],
    references: [user.id],
  }),
}));
