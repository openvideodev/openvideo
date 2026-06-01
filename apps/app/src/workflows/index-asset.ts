// NO top-level imports that use Node.js APIs
// Everything is dynamically imported inside "use step" functions
// to avoid workflow bundle errors

export interface IndexAssetPayload {
  spaceId: string;
  assetId: string;
}

interface Scene {
  startTime: number;
  endTime: number;
  duration: number;
}

// ─── Main Workflow ────────────────────────────────────────────────────────────

export async function indexAssetWorkflow(payload: IndexAssetPayload) {
  "use workflow";

  console.log(
    `[DEBUG:index-asset] ENTRY: spaceId=${payload?.spaceId}, assetId=${payload?.assetId}`,
  );

  const { spaceId, assetId } = payload || {};

  if (!spaceId || !assetId) {
    throw new Error(`Invalid payload: missing spaceId or assetId`);
  }

  try {
    console.log(`[DEBUG:index-asset] Calling markStarted(${assetId})`);
    await markStarted(assetId);
    console.log(`[DEBUG:index-asset] markStarted complete`);

    console.log(`[DEBUG:index-asset] Calling getAsset(${assetId})`);
    const asset = await getAsset(assetId);
    console.log(`[DEBUG:index-asset] getAsset result:`, asset ? `type=${asset.type}` : "null");

    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }

    console.log(`[DEBUG:index-asset] Calling clearExistingVectors(${assetId})`);
    await clearExistingVectors(assetId);
    console.log(`[DEBUG:index-asset] clearExistingVectors complete`);

    console.log(`[DEBUG:index-asset] Starting type handler: type=${asset.type}`);
    if (asset.type === "image") {
      await indexImage(spaceId, asset);
    } else if (asset.type === "audio") {
      await indexAudio(spaceId, asset);
    } else if (asset.type === "video") {
      await indexVideo(spaceId, asset);
    } else {
      console.warn(`[DEBUG:index-asset] Unsupported type: ${asset.type}`);
    }

    console.log(`[DEBUG:index-asset] Calling markCompleted(${assetId})`);
    await markCompleted(assetId);
    await notifyComplete(spaceId, assetId, "success");
    console.log(`[DEBUG:index-asset] Workflow completed successfully`);

    return { success: true, assetId };
  } catch (err: any) {
    console.error(`[DEBUG:index-asset] Workflow error:`, err.message, err.stack);
    await markFailed(assetId, err.message);
    await notifyComplete(spaceId, assetId, "failed", err.message);
    throw err;
  }
}

// ─── Asset Type Handlers ─────────────────────────────────────────────────────

async function indexImage(spaceId: string, asset: any): Promise<void> {
  "use step";

  console.log(`[DEBUG:index-asset:indexImage] Starting: ${asset.name}`);

  const [{ getDB, schema }, { Document }, { GoogleGenAI }] = await Promise.all([
    import("@openvideo/db"),
    import("@langchain/core/documents"),
    import("@google/genai"),
  ]);

  const db = getDB();

  const response = await fetch(asset.src);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

  // Browser-compatible base64 conversion (no Node.js Buffer)
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Data = btoa(binary);

  const mimeType = response.headers.get("content-type") || "image/jpeg";

  const apiKey = process.env.GOOGLE_API_KEY;
  console.log(
    `[DEBUG:index-asset:indexImage] API key check:`,
    apiKey ? `set (length=${apiKey.length})` : "NOT SET - will fail",
  );
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY environment variable is not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  const geminiResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { inlineData: { data: base64Data, mimeType } },
      {
        text: "Describe this image in detail. Include: visible objects and people, any text shown on screen, colors and visual style, overall scene setting and context, and likely topics or themes.",
      },
    ],
  });

  const description = geminiResponse.text || "No description generated.";
  console.log(
    `[DEBUG:index-asset:indexImage] Generated description: ${description.slice(0, 100)}...`,
  );

  await upsertDocuments([
    new Document({
      pageContent: `title: ${asset.name} | description: ${description}`,
      metadata: {
        spaceId,
        assetId: asset.id,
        assetName: asset.name,
        assetType: "image",
        src: asset.src,
        layer: "asset-description",
      },
    }),
  ]);
}

async function indexAudio(spaceId: string, asset: any): Promise<void> {
  "use step";

  console.log(`[DEBUG:index-asset:indexAudio] Starting: ${asset.name}`);

  await updateProgress(asset.id, 10, "transcribing");

  const segments = await transcribeWithDeepgram(asset.src);
  await saveTranscript(spaceId, asset.id, segments);

  const { Document } = await import("@langchain/core/documents");
  const docs = segments.map(
    (seg: any) =>
      new Document({
        pageContent: `title: ${asset.name} | text: ${seg.text}`,
        metadata: {
          spaceId,
          assetId: asset.id,
          assetName: asset.name,
          assetType: "audio",
          src: asset.src,
          layer: "asset-transcript",
          startMs: seg.startMs,
          endMs: seg.endMs,
        },
      }),
  );

  if (docs.length > 0) await upsertDocuments(docs);
}

async function indexVideo(spaceId: string, asset: any): Promise<void> {
  "use step";

  console.log(`[DEBUG:index-asset:indexVideo] Starting: ${asset.name}`);

  const { Sandbox } = await import("@vercel/sandbox");

  await updateProgress(asset.id, 5, "downloading");

  const sandbox = await Sandbox.create();
  console.log(`[DEBUG:index-asset:indexVideo] Sandbox created`);

  try {
    await sandbox.runCommand("sudo", ["dnf", "install", "-y", "ffmpeg"]);
    console.log(`[DEBUG:index-asset:indexVideo] ffmpeg installed`);

    const videoPath = `/tmp/asset-${asset.id}.mp4`;
    await sandbox.runCommand("curl", ["-L", "-o", videoPath, asset.src]);
    console.log(`[DEBUG:index-asset:indexVideo] Video downloaded`);

    await updateProgress(asset.id, 15, "analyzing");
    const result = await sandbox.runCommand("ffmpeg", [
      "-i",
      videoPath,
      "-vf",
      "select='gt(scene,0.3)',showinfo",
      "-f",
      "null",
      "-",
    ]);
    const stderr = await result.stderr();
    const scenes = await parseScenesFromOutput(stderr, videoPath, sandbox);
    console.log(`[DEBUG:index-asset:indexVideo] ${scenes.length} scenes detected`);

    await updateProgress(asset.id, 30, "transcribing");
    const segments = await transcribeWithDeepgram(asset.src);
    await saveTranscript(spaceId, asset.id, segments);
    console.log(`[DEBUG:index-asset:indexVideo] Transcribed ${segments.length} segments`);

    await updateProgress(asset.id, 50, "analyzing");
    const visualScenes: any[] = [];
    for (let i = 0; i < Math.min(scenes.length, 10); i++) {
      const scene = await processSingleScene(sandbox, videoPath, scenes[i], i);
      visualScenes.push(scene);
    }
    await saveVisualTimeline(spaceId, asset.id, visualScenes);
    console.log(`[DEBUG:index-asset:indexVideo] Visual analysis complete`);

    await updateProgress(asset.id, 80, "embedding");
    await storeVideoVectors(spaceId, asset, segments, visualScenes);
    console.log(`[DEBUG:index-asset:indexVideo] Vectors stored`);

    await updateProgress(asset.id, 100, "storing");
  } finally {
    await sandbox.delete().catch(() => {});
    console.log(`[DEBUG:index-asset:indexVideo] Sandbox deleted`);
  }
}

// ─── Scene Processing ────────────────────────────────────────────────────────

async function processSingleScene(
  sandbox: any,
  videoPath: string,
  scene: Scene,
  sceneIndex: number,
): Promise<any> {
  "use step";

  const duration = scene.endTime - scene.startTime;
  const timestamps = [scene.startTime, scene.startTime + duration / 2, scene.endTime];
  const frames: Array<{ base64Data: string; mimeType: string }> = [];

  for (const ts of timestamps) {
    const framePath = `/tmp/frame-${sceneIndex}-${ts.toFixed(2)}.jpg`;
    await sandbox.runCommand("ffmpeg", [
      "-ss",
      ts.toFixed(3),
      "-i",
      videoPath,
      "-frames:v",
      "1",
      "-q:v",
      "3",
      "-vf",
      "scale=640:-1",
      "-f",
      "image2",
      "-y",
      framePath,
    ]);
    const frameResult = await sandbox.runCommand("base64", ["-w", "0", framePath]);
    const frameStdout = await frameResult.stdout();
    frames.push({ base64Data: frameStdout, mimeType: "image/jpeg" });
    await sandbox.runCommand("rm", [framePath]).catch(() => {});
  }

  if (frames.length === 0) {
    return {
      startMs: Math.round(scene.startTime * 1000),
      endMs: Math.round(scene.endTime * 1000),
      description: "No visual content",
      objects: [],
      topics: [],
      keywords: [],
    };
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

  const contents: any[] = frames.map((f) => ({
    inlineData: { data: f.base64Data, mimeType: f.mimeType },
  }));
  contents.push({
    text: "Analyze these video frames. Return JSON: { description, objects[], topics[], keywords[] }",
  });

  const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents });
  const rawText = response.text || "";

  let parsed: any;
  try {
    parsed = JSON.parse(
      rawText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim(),
    );
  } catch {
    parsed = { description: rawText.slice(0, 500), objects: [], topics: [], keywords: [] };
  }

  return {
    startMs: Math.round(scene.startTime * 1000),
    endMs: Math.round(scene.endTime * 1000),
    ...parsed,
  };
}

async function parseScenesFromOutput(
  output: string,
  videoPath: string,
  sandbox: any,
): Promise<Scene[]> {
  "use step";

  const timestamps: number[] = [];
  const regex = /pts_time:(\d+\.?\d*)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(output)) !== null) {
    const time = parseFloat(match[1]);
    if (!isNaN(time)) timestamps.push(time);
  }

  timestamps.sort((a, b) => a - b);

  const durationResult = await sandbox.runCommand("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    videoPath,
  ]);
  const durationStdout = await durationResult.stdout();
  const totalDuration = parseFloat(durationStdout.trim() || "0");

  const scenes: Scene[] = [];
  let currentStart = 0;

  for (const changeTime of timestamps) {
    const duration = changeTime - currentStart;
    if (duration >= 2) {
      scenes.push({ startTime: currentStart, endTime: changeTime, duration });
      currentStart = changeTime;
    }
  }

  if (currentStart < totalDuration && totalDuration - currentStart >= 2) {
    scenes.push({
      startTime: currentStart,
      endTime: totalDuration,
      duration: totalDuration - currentStart,
    });
  }

  return scenes.length > 0
    ? scenes
    : [{ startTime: 0, endTime: totalDuration, duration: totalDuration }];
}

// ─── API & DB Helpers ─────────────────────────────────────────────────────────

async function getAsset(assetId: string) {
  "use step";

  console.log(`[DEBUG:index-asset:getAsset] Importing @openvideo/db`);
  const { getDB, schema, eq } = await import("@openvideo/db");
  console.log(`[DEBUG:index-asset:getAsset] Imported, getting DB`);
  const db = getDB();
  console.log(`[DEBUG:index-asset:getAsset] Querying for asset ${assetId}`);
  const rows = await db.select().from(schema.asset).where(eq(schema.asset.id, assetId));
  console.log(`[DEBUG:index-asset:getAsset] Found ${rows.length} rows`);
  return rows[0];
}

async function clearExistingVectors(assetId: string): Promise<void> {
  "use step";

  const { getDB, sql } = await import("@openvideo/db");
  const db = getDB();
  await db
    .execute(sql`DELETE FROM langchain_pg_embedding WHERE cmetadata->>'assetId' = ${assetId}`)
    .catch(() => {});
}

async function transcribeWithDeepgram(src: string): Promise<any[]> {
  "use step";

  console.log(`[DEBUG:index-asset:transcribeWithDeepgram] Starting for ${src.slice(0, 50)}...`);
  const deepgramKey = process.env.DEEPGRAM_API_KEY;
  if (!deepgramKey) throw new Error("DEEPGRAM_API_KEY not set");

  const url =
    "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&paragraphs=true&utterances=true";
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Token ${deepgramKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url: src }),
  });

  if (!response.ok) throw new Error(`Deepgram error: ${response.status}`);

  const data: any = await response.json();
  const alternative = data.results?.channels?.[0]?.alternatives?.[0];
  const paragraphs = alternative?.paragraphs?.paragraphs || [];
  const allWords = alternative?.words || [];

  const segments: any[] = [];

  if (paragraphs.length > 0) {
    for (const p of paragraphs) {
      const text = p.sentences.map((s: any) => s.text).join(" ");
      segments.push({ text, startMs: Math.round(p.start * 1000), endMs: Math.round(p.end * 1000) });
    }
  } else if (allWords.length > 0) {
    let chunkText = "";
    let chunkStart = allWords[0].start;
    let prevEnd = allWords[0].end;

    for (let i = 0; i < allWords.length; i++) {
      const w = allWords[i];
      const gap = i > 0 ? w.start - prevEnd : 0;

      if (gap > 0.4 && chunkText) {
        segments.push({
          text: chunkText.trim(),
          startMs: Math.round(chunkStart * 1000),
          endMs: Math.round(prevEnd * 1000),
        });
        chunkText = "";
        chunkStart = w.start;
      }

      chunkText += " " + w.word;
      prevEnd = w.end;
    }

    if (chunkText) {
      segments.push({
        text: chunkText.trim(),
        startMs: Math.round(chunkStart * 1000),
        endMs: Math.round(prevEnd * 1000),
      });
    }
  }

  console.log(`[DEBUG:index-asset:transcribeWithDeepgram] Generated ${segments.length} segments`);
  return segments;
}

async function storeVideoVectors(
  spaceId: string,
  asset: any,
  segments: any[],
  visualScenes: any[],
): Promise<void> {
  "use step";

  const { Document } = await import("@langchain/core/documents");
  const docs: any[] = [];

  for (const seg of segments) {
    docs.push(
      new Document({
        pageContent: `title: ${asset.name} | text: ${seg.text}`,
        metadata: { spaceId, assetId: asset.id, layer: "transcript" },
      }),
    );
  }

  for (const scene of visualScenes) {
    docs.push(
      new Document({
        pageContent: `title: ${asset.name} | description: ${scene.description}`,
        metadata: { spaceId, assetId: asset.id, layer: "visual" },
      }),
    );
  }

  if (docs.length > 0) await upsertDocuments(docs);
}

async function upsertDocuments(docs: any[]): Promise<void> {
  "use step";

  console.log(`[DEBUG:index-asset:upsertDocuments] Storing ${docs.length} documents`);
  if (docs.length === 0) return;

  const { PGVectorStore } = await import("@langchain/community/vectorstores/pgvector");
  const { GoogleGenAI } = await import("@google/genai");
  const { Embeddings } = await import("@langchain/core/embeddings");

  const dbUrl = process.env.DATABASE_URL;
  const apiKey = process.env.GOOGLE_API_KEY;
  console.log(
    `[DEBUG:index-asset:upsertDocuments] Env check: DATABASE_URL=${dbUrl ? "set" : "NOT SET"}, GOOGLE_API_KEY=${apiKey ? "set" : "NOT SET"}`,
  );
  if (!dbUrl || !apiKey) throw new Error("DATABASE_URL or GOOGLE_API_KEY not set");

  class GeminiEmbeddings extends Embeddings {
    private ai = new GoogleGenAI({ apiKey });

    async embedDocuments(documents: string[]): Promise<number[][]> {
      const results: number[][] = [];
      for (const doc of documents) {
        const formatted = doc.startsWith("title:") ? doc : `title: none | text: ${doc}`;
        const response = await this.ai.models.embedContent({
          model: "gemini-embedding-2",
          contents: formatted,
        });
        results.push(response.embeddings?.[0]?.values ?? new Array(3072).fill(0));
      }
      return results;
    }

    async embedQuery(query: string): Promise<number[]> {
      const formatted = query.startsWith("task:") ? query : `task: search result | query: ${query}`;
      const response = await this.ai.models.embedContent({
        model: "gemini-embedding-2",
        contents: formatted,
      });
      return response.embeddings?.[0]?.values ?? new Array(3072).fill(0);
    }
  }

  const store = await PGVectorStore.initialize(new GeminiEmbeddings({}), {
    postgresConnectionOptions: { connectionString: dbUrl },
    tableName: "langchain_pg_embedding",
    columns: {
      idColumnName: "id",
      vectorColumnName: "embedding",
      contentColumnName: "document",
      metadataColumnName: "cmetadata",
    },
  });

  await store.addDocuments(docs);
  console.log(`[DEBUG:index-asset:upsertDocuments] Documents stored successfully`);
}

// ─── Status & Notification Helpers ────────────────────────────────────────────

async function markStarted(assetId: string): Promise<void> {
  "use step";

  console.log(`[DEBUG:index-asset:markStarted] ${assetId}`);
  const { getDB, schema, eq } = await import("@openvideo/db");
  const db = getDB();
  await db
    .update(schema.assetIndexingStatus)
    .set({ status: "processing", startedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.assetIndexingStatus.assetId, assetId));
  console.log(`[DEBUG:index-asset:markStarted] Complete`);
}

async function updateProgress(assetId: string, progress: number, stage?: string): Promise<void> {
  "use step";

  console.log(`[DEBUG:index-asset:updateProgress] ${assetId}: ${progress}% (${stage})`);
  const { getDB, schema, eq } = await import("@openvideo/db");
  const db = getDB();
  const updates: any = { progress, updatedAt: new Date() };
  if (stage) updates.stage = stage;
  await db
    .update(schema.assetIndexingStatus)
    .set(updates)
    .where(eq(schema.assetIndexingStatus.assetId, assetId));
}

async function markCompleted(assetId: string): Promise<void> {
  "use step";

  console.log(`[DEBUG:index-asset:markCompleted] ${assetId}`);
  const { getDB, schema, eq } = await import("@openvideo/db");
  const db = getDB();
  await db
    .update(schema.assetIndexingStatus)
    .set({ status: "completed", progress: 100, completedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.assetIndexingStatus.assetId, assetId));
  console.log(`[DEBUG:index-asset:markCompleted] Complete`);
}

async function markFailed(assetId: string, error: string): Promise<void> {
  "use step";

  console.log(`[DEBUG:index-asset:markFailed] ${assetId}: ${error}`);
  const { getDB, schema, eq } = await import("@openvideo/db");
  const db = getDB();
  await db
    .update(schema.assetIndexingStatus)
    .set({ status: "failed", error, updatedAt: new Date() })
    .where(eq(schema.assetIndexingStatus.assetId, assetId));
}

async function saveTranscript(spaceId: string, assetId: string, segments: any[]): Promise<void> {
  "use step";

  console.log(`[DEBUG:index-asset:saveTranscript] ${assetId}: ${segments.length} segments`);
  const { getDB, schema } = await import("@openvideo/db");
  const { nanoid } = await import("nanoid");
  const db = getDB();
  await db
    .insert(schema.assetTranscript)
    .values({ id: nanoid(), assetId, spaceId, segments })
    .onConflictDoUpdate({ target: schema.assetTranscript.assetId, set: { segments } });
}

async function saveVisualTimeline(spaceId: string, assetId: string, scenes: any[]): Promise<void> {
  "use step";

  console.log(`[DEBUG:index-asset:saveVisualTimeline] ${assetId}: ${scenes.length} scenes`);
  const { getDB, schema } = await import("@openvideo/db");
  const { nanoid } = await import("nanoid");
  const db = getDB();
  await db
    .insert(schema.assetVisualTimeline)
    .values({ id: nanoid(), assetId, spaceId, scenes })
    .onConflictDoUpdate({ target: schema.assetVisualTimeline.assetId, set: { scenes } });
}

async function notifyComplete(
  spaceId: string,
  assetId: string,
  status: "success" | "failed",
  error?: string,
): Promise<void> {
  "use step";

  console.log(`[DEBUG:index-asset:notifyComplete] ${assetId}: ${status}`);
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log(`[DEBUG:index-asset:notifyComplete] No REDIS_URL`);
    return;
  }

  const { default: Redis } = await import("ioredis");
  const redis = new Redis(redisUrl);
  try {
    await redis.publish(
      `space:updates:${spaceId}`,
      JSON.stringify({ type: "asset.indexed", assetId, status, error }),
    );
    console.log(`[DEBUG:index-asset:notifyComplete] Redis notification sent`);
  } catch (err) {
    console.error(`[DEBUG:index-asset:notifyComplete] Redis failed:`, err);
  } finally {
    await redis.quit();
  }
}
