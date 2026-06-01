import { start } from "workflow/api";
import { NextRequest, NextResponse } from "next/server";
import {
  indexAssetWorkflow,
  generateElevenLabsAudioWorkflow,
  generateImageWorkflow,
  generateVideoWorkflow,
} from "@/workflows";

const WORKFLOWS: Record<string, any> = {
  "index-asset": indexAssetWorkflow,
  "generate-elevenlabs-audio": generateElevenLabsAudioWorkflow,
  "generate-image": generateImageWorkflow,
  "generate-video": generateVideoWorkflow,
};

/**
 * POST /api/workflows/start
 * HTTP bridge for Director (NestJS) to trigger Vercel Workflows.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workflow, payload } = body;

    console.log(`[DEBUG] /api/workflows/start received: workflow=${workflow}`, payload);

    if (!workflow || !WORKFLOWS[workflow]) {
      console.error(`[DEBUG] Unknown workflow requested: ${workflow}`);
      return NextResponse.json({ error: `Unknown workflow: ${workflow}` }, { status: 400 });
    }

    const workflowFn = WORKFLOWS[workflow];
    console.log(`[DEBUG] Found workflow function for ${workflow}, calling start()`);

    // Fire-and-forget: start the workflow and return immediately
    // Note: start() expects an array of arguments, not a direct object
    const handle = await start(workflowFn, [payload]);

    console.log(`[DEBUG] Workflow ${workflow} started with runId: ${handle.runId}`);

    return NextResponse.json({
      success: true,
      workflow,
      runId: handle.runId,
    });
  } catch (error: any) {
    console.error("[DEBUG] Failed to start workflow:", error);
    return NextResponse.json(
      { error: error.message || "Failed to start workflow" },
      { status: 500 },
    );
  }
}
