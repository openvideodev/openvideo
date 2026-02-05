import { d as defineEventHandler, r as readBody, c as createError } from '../../nitro/nitro.mjs';
import { createClient } from '@deepgram/sdk';
import { detectAll } from 'tinyld';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

async function detectLanguage(text) {
  const tinyldResults = detectAll(text);
  const results = tinyldResults.map((result) => ({
    language: result.lang,
    languageName: languageCodeToName(result.lang),
    confidence: result.accuracy
  }));
  const [mainLanguage] = results;
  if (mainLanguage.language === "und") {
    mainLanguage.language = "en";
    mainLanguage.languageName = "English";
  }
  return mainLanguage;
}
function languageCodeToName(languageCode) {
  const languageNames = new Intl.DisplayNames(["en"], { type: "language" });
  let translatedLanguageName;
  try {
    translatedLanguageName = languageNames.of(languageCode);
  } catch (e) {
  }
  return translatedLanguageName || "Unknown";
}

const getWords = (deepgramResult) => {
  var _a, _b, _c, _d;
  const alternative = (_d = (_c = (_b = (_a = deepgramResult == null ? void 0 : deepgramResult.results) == null ? void 0 : _a.channels) == null ? void 0 : _b[0]) == null ? void 0 : _c.alternatives) == null ? void 0 : _d[0];
  if (!(alternative == null ? void 0 : alternative.words)) {
    return [];
  }
  return alternative.words.map((w) => {
    return {
      word: w.punctuated_word,
      start: w.start,
      end: w.end,
      confidence: w.confidence
    };
  });
};
const getParagraphs = (deepgramResult) => {
  var _a, _b, _c, _d, _e;
  const alternative = (_d = (_c = (_b = (_a = deepgramResult == null ? void 0 : deepgramResult.results) == null ? void 0 : _a.channels) == null ? void 0 : _b[0]) == null ? void 0 : _c.alternatives) == null ? void 0 : _d[0];
  if (!((_e = alternative == null ? void 0 : alternative.paragraphs) == null ? void 0 : _e.paragraphs)) {
    return [];
  }
  const paragraphs = alternative.paragraphs.paragraphs.map((p) => {
    return {
      sentences: p.sentences.map((s) => {
        return {
          text: s.text,
          start: s.start,
          end: s.end
        };
      }),
      numWords: p.num_words,
      start: p.start,
      end: p.end
    };
  }).filter((p) => p.sentences.length > 0);
  return paragraphs;
};
async function deepgramToCombo(deepgramResult) {
  var _a, _b, _c, _d, _e;
  const alternative = (_d = (_c = (_b = (_a = deepgramResult == null ? void 0 : deepgramResult.results) == null ? void 0 : _a.channels) == null ? void 0 : _b[0]) == null ? void 0 : _c.alternatives) == null ? void 0 : _d[0];
  const text = alternative == null ? void 0 : alternative.transcript;
  if (!text) {
    return null;
  }
  const language = await detectLanguage(text);
  const words = getWords(deepgramResult);
  const duration = ((_e = deepgramResult == null ? void 0 : deepgramResult.metadata) == null ? void 0 : _e.duration) || 0;
  const paragraphs = getParagraphs(deepgramResult);
  return {
    duration,
    results: {
      main: {
        language,
        paragraphs,
        text,
        words
      }
    }
  };
}

async function transcribe(options) {
  const {
    url,
    apiKey = process.env.DEEPGRAM_API_KEY || process.env.DEPPGRAM_KEY,
    language,
    model = "nova-3",
    smartFormat = true,
    paragraphs = true} = options;
  if (!url) {
    throw new Error("Audio URL is required");
  }
  if (!apiKey) {
    throw new Error("Deepgram API key is required");
  }
  const deepgram = createClient(apiKey);
  const deepgramOptions = {
    model,
    smart_format: smartFormat,
    paragraphs,
    detect_language: true
  };
  if (language && language !== "auto") {
    deepgramOptions.language = language;
  }
  const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
    { url },
    deepgramOptions
  );
  if (error) {
    throw new Error(error.message || "Failed to transcribe audio");
  }
  const parsed = await deepgramToCombo(result);
  return parsed;
}

const transcribe_post = defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { url, targetLanguage, language, model } = body;
    if (!url) {
      throw createError({
        statusCode: 400,
        message: "Audio URL is required"
      });
    }
    const result = await transcribe({
      url,
      language: targetLanguage || language,
      // Support both field names
      model: model || "nova-3",
      smartFormat: true,
      paragraphs: true
    });
    return result;
  } catch (error) {
    console.error("Transcription error:", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Internal server error"
    });
  }
});

export { transcribe_post as default };
//# sourceMappingURL=transcribe.post.mjs.map
