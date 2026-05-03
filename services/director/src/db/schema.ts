import { pgTable, text, json, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

// ── project ────────────────────────────────────────────────────────────────────
export const project = pgTable(
  'project',
  {
    id:        text('id').primaryKey(),
    name:      text('name').notNull(),
    userId:    text('userId').notNull(),
    data:      json('data').$type<any>().notNull(), // Stores the entire IProject snapshot
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (t) => [index('project_userId_idx').on(t.userId)],
);

// ── director_session ────────────────────────────────────────────────────────────
export const directorSession = pgTable(
  'director_session',
  {
    id:           text('id').primaryKey(),
    projectId:    text('projectId').notNull(),
    userId:       text('userId').notNull(),
    historyJson:  json('historyJson').$type<any[]>().notNull().default([]),
    pendingPlan:  json('pendingPlan').$type<any>(),
    activePlanId: text('activePlanId'),
    createdAt:    timestamp('createdAt').defaultNow().notNull(),
    updatedAt:    timestamp('updatedAt').defaultNow().notNull(),
  },
  (t) => [index('director_session_projectId_userId_idx').on(t.projectId, t.userId)],
);

// ── clip_transcript ─────────────────────────────────────────────────────────────
export const clipTranscript = pgTable(
  'clip_transcript',
  {
    id:        text('id').primaryKey(),
    clipId:    text('clipId').notNull(),
    projectId: text('projectId').notNull(),
    segments:  json('segments').$type<any[]>().notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('clip_transcript_clipId_idx').on(t.clipId),
    index('clip_transcript_projectId_idx').on(t.projectId),
  ],
);
