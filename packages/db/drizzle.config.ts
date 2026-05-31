import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://localhost:5432/openvideo",
  },
  tablesFilter: ["!*_rls"],
});
