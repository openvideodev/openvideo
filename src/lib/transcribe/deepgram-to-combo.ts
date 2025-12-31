import { detectLanguage } from './detect-language';
import type { Paragraph, TranscriptObject, Word } from './types';

const getWords = (deepgramResult: any): Word[] => {
  const words = deepgramResult.results.channels[0].alternatives[0].words.map(
    (w: any) => {
      return {
        word: w.punctuated_word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
      };
    }
  );
  return words;
};

const getParagraphs = (deepgramResult: any): Paragraph[] => {
  const paragraphs =
    deepgramResult.results.channels[0].alternatives[0].paragraphs.paragraphs
      .map((p: any) => {
        return {
          sentences: p.sentences.map((s: any) => {
            return {
              text: s.text,
              start: s.start,
              end: s.end,
            };
          }),
          numWords: p.num_words,
          start: p.start,
          end: p.end,
        };
      })
      .filter((p: any) => p.sentences.length > 0);

  return paragraphs;
};

export async function deepgramToCombo(
  deepgramResult: any
): Promise<Partial<TranscriptObject>> {
  const text = deepgramResult.results.channels[0].alternatives[0].transcript;
  const language = await detectLanguage(text);
  const words = getWords(deepgramResult);
  const duration = deepgramResult.metadata.duration;
  const paragraphs = getParagraphs(deepgramResult);

  return {
    duration,
    results: {
      main: {
        language,
        paragraphs,
        text,
        words,
      },
    },
  };
}
