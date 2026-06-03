const { Client } = require("pg");

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:VQqEUpScxDbiwUrmXRYkYixQkpCUjlTL@kodama.proxy.rlwy.net:57541/railway";

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  console.log("Connected to database. Fixing LangChain tables...");

  try {
    // 1. Drop existing tables
    console.log("Dropping old tables...");
    await client.query("DROP TABLE IF EXISTS langchain_pg_embedding CASCADE;");
    await client.query("DROP TABLE IF EXISTS langchain_pg_collection CASCADE;");
    console.log("✅ Dropped tables.");

    // 2. Ensure extension is created
    console.log("Ensuring pgvector extension exists...");
    await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
    console.log("✅ Extension checked.");

    // 3. Create collection table
    console.log("Creating langchain_pg_collection table...");
    await client.query(`
      CREATE TABLE langchain_pg_collection (
        uuid uuid NOT NULL PRIMARY KEY,
        name character varying NOT NULL UNIQUE,
        cmetadata json
      );
    `);
    console.log("✅ Created langchain_pg_collection.");

    // 4. Create embedding table
    console.log("Creating langchain_pg_embedding table...");
    await client.query(`
      CREATE TABLE langchain_pg_embedding (
        id uuid NOT NULL PRIMARY KEY,
        collection_id uuid REFERENCES langchain_pg_collection(uuid) ON DELETE CASCADE,
        embedding vector,
        document text,
        cmetadata jsonb
      );
    `);
    console.log("✅ Created langchain_pg_embedding.");

    console.log("🚀 Database fix completed successfully!");
  } catch (err) {
    console.error("❌ Error fixing database:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
