import { task } from "@trigger.dev/sdk/v3";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import Redis from "ioredis";

const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY!;
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

export interface ElevenLabsAudioPayload {
  spaceId: string;
  stepId: string;
  prompt: string;
  durationSeconds: number;
  audioType: "background-music" | "sound-effect";
}

/**
 * Calls the ElevenLabs Sound Generation API, uploads the result to R2,
 * then notifies the NestJS server via Redis pub/sub so it can add the
 * audio clip to the timeline.
 *
 * ElevenLabs Sound Generation endpoint:
 *   POST https://api.elevenlabs.io/v1/sound-generation
 *   Body: { text, duration_seconds, prompt_influence }
 *   Response: audio/mpeg binary stream
 */
export const generateElevenLabsAudioTask = task({
  id: "generate-elevenlabs-audio",
  maxDuration: 120,
  run: async (payload: ElevenLabsAudioPayload) => {
    const { spaceId, stepId, prompt, durationSeconds, audioType } = payload;

    const response = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsApiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: prompt,
        duration_seconds: Math.min(durationSeconds, 22),
        prompt_influence: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error ${response.status}: ${errorText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const fileName = `generated/${spaceId}/${stepId}-${audioType}.mp3`;

    await s3.send(
      new PutObjectCommand({
        Bucket: r2Config.bucketName,
        Key: fileName,
        Body: audioBuffer,
        ContentType: "audio/mpeg",
      }),
    );

    const audioUrl = `${r2Config.publicUrl}/${fileName}`;

    await redis.publish(
      `space:updates:${spaceId}`,
      JSON.stringify({
        type: "plan.step",
        stepId,
        status: "done",
        result: { audioUrl, prompt, audioType },
      }),
    );

    return { audioUrl, audioType };
  },
});
