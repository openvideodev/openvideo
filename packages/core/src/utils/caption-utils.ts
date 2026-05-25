import type { ICaptionWord } from "../types";
export type { ICaptionWord };

/**
 * Redistributes caption words to match a new text string while attempting to preserve existing timings.
 *
 * @param text The new full text for the caption
 * @param currentWords The existing words array with timings
 * @param durationUs The total duration of the clip in microseconds
 * @returns A new array of words matching the text
 */
export function redistributeCaptionWords(
  text: string,
  currentWords: ICaptionWord[],
  durationUs: number,
): ICaptionWord[] {
  const normalizeWhitespace = (s: string) => s.replace(/\s+/g, " ").trim();
  const currentJoinedText = currentWords.map((w) => w.text).join(" ");

  if (normalizeWhitespace(text) === normalizeWhitespace(currentJoinedText)) {
    return currentWords;
  }

  const lines = text.split("\n");
  const newWordsInfo: Array<{ text: string; paragraphIndex: number }> = [];

  lines.forEach((line, lineIndex) => {
    const wordsInLine = line
      .trim()
      .split(/\s+/)
      .filter((w) => w !== "");
    wordsInLine.forEach((word) => {
      newWordsInfo.push({ text: word, paragraphIndex: lineIndex });
    });
  });

  if (newWordsInfo.length === 0) {
    return [];
  }

  // If word count is same, just update text and paragraphIndex but preserve timings
  if (newWordsInfo.length === currentWords.length) {
    return currentWords.map((w, i) => ({
      ...w,
      text: newWordsInfo[i].text,
      paragraphIndex: newWordsInfo[i].paragraphIndex,
    }));
  }

  // Otherwise, redistribute timings equally
  const totalDurationMs = durationUs / 1000;
  const wordDuration = totalDurationMs / newWordsInfo.length;
  return newWordsInfo.map((info, i) => ({
    ...(currentWords[i] ? { ...currentWords[i], text: info.text } : { isKeyWord: false }),
    text: info.text,
    from: i * wordDuration,
    to: (i + 1) * wordDuration,
    paragraphIndex: info.paragraphIndex,
  }));
}
