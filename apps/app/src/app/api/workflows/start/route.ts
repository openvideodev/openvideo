import { start } from "workflow/api";
import { processAssetWorkflow } from "@/workflows/process-asset";

export async function POST(req: Request) {
  try {
    const { workflow, payload } = await req.json();

    if (workflow !== "process-asset") {
      return Response.json({ error: "Unknown workflow" }, { status: 400 });
    }

    const run = await start(processAssetWorkflow, [payload]);

    return Response.json({
      success: true,
      runId: run.runId,
      status: "started",
    });
  } catch (error: any) {
    console.error("[Workflow API] Failed to start workflow:", error);
    return Response.json({ error: error.message || "Failed to start workflow" }, { status: 500 });
  }
}
