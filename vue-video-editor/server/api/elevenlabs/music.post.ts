import { R2StorageService } from '../../utils/r2';

const r2 = new R2StorageService({
  bucketName: process.env.R2_BUCKET_NAME || '',
  accountId: process.env.R2_ACCOUNT_ID || '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  cdn: process.env.R2_PUBLIC_DOMAIN || '',
});

export default defineEventHandler(async (event) => {
  try {
    const { text, duration } = await readBody(event);

    if (!text) {
      throw createError({
        statusCode: 400,
        message: 'Text/Description is required',
      });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    // Using SFX endpoint for now as discussed in source
    const url = `${process.env.ELEVENLABS_URL}/v1/sound-generation`;

    const headers = {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey || '',
    };

    const data = {
      text, // Prompt might need to be adjusted to encourage "musical" results
      duration_seconds: duration || undefined,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs Music/SFX API Error:', errorText);
      throw createError({
        statusCode: response.status,
        message: 'Failed to generate music',
        data: { details: errorText },
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = `music/${Date.now()}.mp3`;
    const publicUrl = await r2.uploadData(fileName, buffer, 'audio/mpeg');

    return { url: publicUrl };
  } catch (error: any) {
    console.error('Music generation error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    });
  }
});
