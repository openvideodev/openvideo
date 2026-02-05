import { d as defineEventHandler, c as createError, g as getQuery } from '../../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const pexels_get = defineEventHandler(async (event) => {
  const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
  if (!PEXELS_API_KEY) {
    throw createError({
      statusCode: 500,
      message: "PEXELS_API_KEY is not configured"
    });
  }
  const { type = "image", query, page = "1", per_page = "20" } = getQuery(event);
  const perPage = per_page;
  let url = "";
  if (type === "image") {
    url = query ? `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}` : `https://api.pexels.com/v1/curated?page=${page}&per_page=${perPage}`;
  } else {
    url = query ? `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}` : `https://api.pexels.com/videos/popular?page=${page}&per_page=${perPage}`;
  }
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY
      }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw createError({
        statusCode: response.status,
        message: errorData.message || "Failed to fetch from Pexels"
      });
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Pexels API Error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Internal Server Error"
    });
  }
});

export { pexels_get as default };
//# sourceMappingURL=pexels.get.mjs.map
