// NO top-level imports that use Node.js APIs

export interface ElevenLabsAudioPayload {
  spaceId: string;
  stepId: string;
  prompt: string;
  durationSeconds: number;
  audioType: "background-music" | "sound-effect";
}

export async function generateElevenLabsAudioWorkflow(payload: ElevenLabsAudioPayload) {
  "use workflow";

  const { spaceId, stepId, prompt, durationSeconds, audioType } = payload;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  console.log(
    `[DEBUG:elevenlabs-audio] API key check:`,
    apiKey ? `set (length=${apiKey.length})` : "NOT SET",
  );
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

  const audioBuffer = await callElevenLabsAPI(apiKey, prompt, durationSeconds);
  const audioUrl = await uploadAudioToR2(spaceId, stepId, audioType, audioBuffer);
  await notifyViaRedis(spaceId, stepId, audioUrl, prompt, audioType);

  return { audioUrl, audioType, stepId };
}

async function callElevenLabsAPI(
  apiKey: string,
  prompt: string,
  durationSeconds: number,
): Promise<Uint8Array> {
  "use step";

  const response = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
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

  return new Uint8Array(await response.arrayBuffer());
}

async function uploadAudioToR2(
  spaceId: string,
  stepId: string,
  audioType: string,
  audioBuffer: Uint8Array,
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

  const fileName = `generated/${spaceId}/${stepId}-${audioType}.mp3`;

  await s3.send(
    new PutObjectCommand({
      Bucket: r2Config.bucketName,
      Key: fileName,
      Body: audioBuffer,
      ContentType: "audio/mpeg",
    }),
  );

  return `${r2Config.publicUrl}/${fileName}`;
}

async function notifyViaRedis(
  spaceId: string,
  stepId: string,
  audioUrl: string,
  prompt: string,
  audioType: string,
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
        result: { audioUrl, prompt, audioType },
      }),
    );
  } finally {
    await redis.quit();
  }
}
