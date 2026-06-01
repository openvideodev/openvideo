// NO top-level imports that use Node.js APIs

import { sleep } from "workflow";

export interface GenerateImagePayload {
  spaceId: string;
  stepId: string;
  prompt: string;
}

export interface GenerateVideoPayload {
  spaceId: string;
  stepId: string;
  imageUrl: string;
  prompt: string;
}

export async function generateImageWorkflow(payload: GenerateImagePayload) {
  "use workflow";

  const { spaceId, stepId, prompt } = payload;
  const apiKey = process.env.GOOGLE_API_KEY;

  console.log(
    `[DEBUG:generateImage] API key check:`,
    apiKey ? `set (length=${apiKey.length})` : "NOT SET",
  );
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not set");

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp-image-generation",
    contents: prompt,
  });

  let imageUrl = "";

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data) {
      const imageData = part.inlineData.data;
      // Browser-compatible base64 to Uint8Array
      const binaryString = atob(imageData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const fileName = `generated/${spaceId}/${stepId}.png`;
      imageUrl = await uploadToR2(fileName, bytes, "image/png");
      break;
    }
  }

  if (!imageUrl) {
    throw new Error("No image data found in model response");
  }

  await notifyViaRedis(spaceId, stepId, { imageUrl, prompt });
  return { imageUrl };
}

export async function generateVideoWorkflow(payload: GenerateVideoPayload) {
  "use workflow";

  const { spaceId, stepId, prompt } = payload;
  const apiKey = process.env.GOOGLE_API_KEY;

  console.log(
    `[DEBUG:generateVideo] API key check:`,
    apiKey ? `set (length=${apiKey.length})` : "NOT SET",
  );
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not set");

  // Start Veo 3 video generation
  const operationId = await startVeoJob(apiKey, payload.imageUrl, prompt);

  let status = "running";
  let videoUrl = "";

  // Durable polling loop with sleep() - no CPU cost while waiting
  while (status !== "done") {
    await sleep("15s");

    const result = await pollVeoStatus(apiKey, operationId);
    status = result.status;
    videoUrl = result.videoUrl || "";

    if (status === "failed") {
      throw new Error(`Video generation failed: ${result.error}`);
    }
  }

  await notifyViaRedis(spaceId, stepId, { videoUrl, prompt });
  return { videoUrl };
}

async function uploadToR2(
  fileName: string,
  data: Uint8Array,
  contentType: string,
): Promise<string> {
  "use step";

  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const r2Config = {
    accountId: process.env.R2_ACCOUNT_ID!,
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    bucketName: process.env.R2_BUCKET_NAME!,
    publicUrl: process.env.R2_PUBLIC_URL!,
  };

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey,
    },
  });

  await s3.send(
    new PutObjectCommand({
      Bucket: r2Config.bucketName,
      Key: fileName,
      Body: data,
      ContentType: contentType,
    }),
  );

  return `${r2Config.publicUrl}/${fileName}`;
}

async function startVeoJob(apiKey: string, imageUrl: string, prompt: string): Promise<string> {
  "use step";

  console.log("Starting Veo 3 video generation", { imageUrl, prompt: prompt.slice(0, 50) });
  return `veo-op-${Date.now()}`;
}

async function pollVeoStatus(
  apiKey: string,
  operationId: string,
): Promise<{ status: string; videoUrl?: string; error?: string }> {
  "use step";

  console.log("Polling Veo 3 status", { operationId });
  return { status: "done", videoUrl: "https://example.com/mock-video.mp4" };
}

async function notifyViaRedis(
  spaceId: string,
  stepId: string,
  result: Record<string, any>,
): Promise<void> {
  "use step";

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return;

  const { default: Redis } = await import("ioredis");
  const redis = new Redis(redisUrl);
  try {
    await redis.publish(
      `space:updates:${spaceId}`,
      JSON.stringify({
        type: "plan.step",
        stepId,
        status: "done",
        result,
      }),
    );
  } finally {
    await redis.quit();
  }
}
