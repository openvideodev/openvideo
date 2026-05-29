import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { PlannerService } from "../src/planner/planner.service";
import { DrizzleService } from "../src/db/drizzle.service";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  console.log("Booting NestJS application context...");
  const app = await NestFactory.createApplicationContext(AppModule);
  const db = app.get(DrizzleService);
  const planner = app.get(PlannerService);

  const testSpaceId = "test_space_" + Math.floor(Math.random() * 1000000);
  console.log("Created test space ID:", testSpaceId);

  // 1. Insert a mock asset into the DB for this project
  const mockAssetId = "mock_asset_" + Date.now();
  await db.db.insert(schema.asset).values({
    id: mockAssetId,
    spaceId: testSpaceId,
    name: "avatar1.png",
    type: "image",
    src: "https://cdn.scenify.io/mockuser/avatar1.png",
    duration: null,
    size: 667816,
    updatedAt: new Date(),
  });
  console.log("Inserted mock asset avatar1.png into database.");

  // 2. Query the planner
  console.log("Invoking PlannerService.generatePlan...");
  try {
    const plan = await planner.generatePlan(
      testSpaceId,
      "session_123",
      "what assets are available in the space?",
    );

    console.log("\n=======================================");
    console.log("              GENERATED PLAN            ");
    console.log("=======================================");
    console.log("Goal:", plan.goal);
    console.log("Summary:", plan.summary);
    console.log("Requires Confirmation:", plan.requiresConfirmation);
    console.log("Steps:", JSON.stringify(plan.steps, null, 2));
    console.log("=======================================\n");
  } catch (err) {
    console.error("Planner failed:", err);
  } finally {
    // 3. Clean up DB
    await db.db.delete(schema.asset).where(eq(schema.asset.spaceId, testSpaceId));
    console.log("Cleaned up mock asset from database.");
    await app.close();
  }
}

run().catch(console.error);
