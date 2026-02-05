import { transcribe } from '../utils/transcribe';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { url, targetLanguage, language, model } = body;

    if (!url) {
      throw createError({
        statusCode: 400,
        message: 'Audio URL is required',
      });
    }

    // Transcribe audio using the shared transcribe library
    const result = await transcribe({
      url,
      language: targetLanguage || language, // Support both field names
      model: model || 'nova-3',
      smartFormat: true,
      paragraphs: true,
    });

    return result;
  } catch (error: any) {
    console.error('Transcription error:', error);
    throw createError({
      statusCode: 500,
      message: error.message || 'Internal server error',
    });
  }
});
