import { task, wait } from "@trigger.dev/sdk/v3";
import { GoogleGenAI } from "@google/genai";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import Redis from "ioredis";

// We'll assume these are set in the environment
const googleApiKey = process.env.GOOGLE_API_KEY!;
const r2Config = {
  accountId: process.env.R2_ACCOUNT_ID!,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  bucketName: process.env.R2_BUCKET_NAME!,
  publicUrl: process.env.R2_PUBLIC_URL!,
};
const redisUrl = process.env.REDIS_URL!;

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2Config.accessKeyId,
    secretAccessKey: r2Config.secretAccessKey,
  },
});

const redis = new Redis(redisUrl);

export const generateImageTask = task({
  id: "generate-image",
  run: async (payload: { projectId: string; stepId: string; prompt: string }) => {
    const ai = new GoogleGenAI({ apiKey: googleApiKey });
    
    // Nano Banana 2 (Gemini 3.1 Flash Image Preview)
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: payload.prompt,
    });

    let imageUrl = "";

    // Process parts to find the generated image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        const fileName = `generated/${payload.projectId}/${payload.stepId}.png`;

        await s3.send(new PutObjectCommand({
          Bucket: r2Config.bucketName,
          Key: fileName,
          Body: buffer,
          ContentType: "image/png",
        }));

        imageUrl = `${r2Config.publicUrl}/${fileName}`;
        break;
      }
    }

    if (!imageUrl) {
      throw new Error("No image data found in model response");
    }

    // Notify NestJS via Redis
    await redis.publish(`project:updates:${payload.projectId}`, JSON.stringify({
      type: "plan.step",
      stepId: payload.stepId,
      status: "done",
      result: { imageUrl, prompt: payload.prompt },
    }));

    return { imageUrl };
  },
});

export const generateVideoTask = task({
  id: "generate-video",
  run: async (payload: { projectId: string; stepId: string; imageUrl: string; prompt: string }) => {
    // Note: Veo 3 integration will follow similar async patterns
    // Placeholder for Veo 3 API call (which is often long-running/async)
    const operationId = "op_12345"; 

    let status = "running";
    let videoUrl = "";

    // Durable Polling Loop
    while (status !== "done") {
      await wait.for({ seconds: 15 });
      
      // status = await checkVeoStatus(operationId);
      status = "done"; 
      videoUrl = "https://example.com/fake-video.mp4";
    }

    await redis.publish(`project:updates:${payload.projectId}`, JSON.stringify({
      type: "plan.step",
      stepId: payload.stepId,
      status: "done",
      result: { videoUrl, prompt: payload.prompt },
    }));

    return { videoUrl };
  },
});
