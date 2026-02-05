export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const response = await fetch(
      'https://api-editor.cloud-45c.workers.dev/api/sound-effects/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw createError({
        statusCode: response.status,
        message: errorData.message || 'Failed to fetch sound effects',
      });
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('SFX API Error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error',
    });
  }
});
