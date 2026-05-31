// Main exports
export { getDB, getPool, schema } from "./client.js";
export type { DB } from "./client.js";

// Re-export all schema for convenience
export * from "./schema/index.js";
export * from "drizzle-orm";
