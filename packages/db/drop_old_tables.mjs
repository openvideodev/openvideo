import pkg from "pg";
const { Client } = pkg;

const databaseUrl =
  "postgresql://postgres:VQqEUpScxDbiwUrmXRYkYixQkpCUjlTL@kodama.proxy.rlwy.net:57541/railway";

async function run() {
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log("Connected. Dropping old tables...");

    await client.query("DROP TABLE IF EXISTS project CASCADE;");
    console.log("Dropped 'project'");

    await client.query("DROP TABLE IF EXISTS space CASCADE;");
    console.log("Dropped 'space'");

    console.log("Done!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
