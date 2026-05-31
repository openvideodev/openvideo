import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";

// Connection pool configuration
const createPool = (connectionString: string) => {
  return new Pool({
    connectionString,
    // Connection pool settings
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection not established
  });
};

// Global pool instance (singleton)
let globalPool: Pool | null = null;

export function getPool(connectionString?: string): Pool {
  if (!globalPool) {
    const dbUrl = connectionString || process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL is not defined");
    }
    globalPool = createPool(dbUrl);
  }
  return globalPool;
}

// Drizzle ORM instance with schema
export function getDB(connectionString?: string) {
  const pool = getPool(connectionString);
  return drizzle(pool, { schema });
}

// Types for the database client
export type DB = ReturnType<typeof getDB>;

// Export schema for direct access
export { schema };
