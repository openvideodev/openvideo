import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, integer, json, index } from "drizzle-orm/pg-core";
import { user } from "./auth.js";

export const space = pgTable(
  "spaces",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    thumbnail: text("thumbnail"),
    width: integer("width").default(1080).notNull(),
    height: integer("height").default(1920).notNull(),
    fps: integer("fps").default(30).notNull(),
    scene: json("scene")
      .$type<{
        tracks: any[];
        clips: Record<string, any>;
        settings?: any;
      }>()
      .notNull()
      .default({ tracks: [], clips: {}, settings: {} }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    orgId: text("org_id"), // Optional: for future multi-tenancy
    data: json("data").$type<any>(), // Stores any extra metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("space_userId_idx").on(t.userId), index("space_orgId_idx").on(t.orgId)],
);

export const directorSession = pgTable(
  "director_session",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    orgId: text("org_id"),
    historyJson: json("history_json").$type<any[]>().notNull().default([]),
    pendingPlan: json("pending_plan").$type<any>(),
    activePlanId: text("active_plan_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("director_session_spaceId_userId_idx").on(t.spaceId, t.userId),
    index("director_session_orgId_idx").on(t.orgId),
  ],
);

export const spaceRelations = relations(space, ({ one, many }) => ({
  user: one(user, {
    fields: [space.userId],
    references: [user.id],
  }),
  directorSessions: many(directorSession),
}));

export const directorSessionRelations = relations(directorSession, ({ one }) => ({
  space: one(space, {
    fields: [directorSession.spaceId],
    references: [space.id],
  }),
  user: one(user, {
    fields: [directorSession.userId],
    references: [user.id],
  }),
}));
