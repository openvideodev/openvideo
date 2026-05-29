import { type NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { R2StorageService } from "@/lib/r2";

const r2 = new R2StorageService({
  bucketName: config.r2.bucket,
  accessKeyId: config.r2.accessKeyId,
  secretAccessKey: config.r2.secretAccessKey,
  accountId: config.r2.accountId,
  cdn: config.r2.cdn,
});

export async function DELETE(request: NextRequest) {
  try {
    const { src } = await request.json();

    if (!src || typeof src !== "string") {
      return NextResponse.json({ error: "src is required" }, { status: 400 });
    }

    await r2.deleteObject(src);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting upload:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete upload" },
      { status: 500 },
    );
  }
}
