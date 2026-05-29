export interface TranscriptSegment {
  text: string;
  startMs: number;
  endMs: number;
  words?: Array<{ word: string; startMs: number; endMs: number }>;
}

export async function transcribeWithDeepgram(src: string): Promise<TranscriptSegment[]> {
  const deepgramKey = process.env.DEEPGRAM_API_KEY;
  if (!deepgramKey) throw new Error("DEEPGRAM_API_KEY is not set");

  const url =
    "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&paragraphs=true&utterances=true";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${deepgramKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: src }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Deepgram API error: ${response.status} - ${errText}`);
  }

  const data: any = await response.json();
  const alternative = data.results?.channels?.[0]?.alternatives?.[0];
  const paragraphs: any[] = alternative?.paragraphs?.paragraphs || [];
  const allWords: any[] = alternative?.words || [];
  const segments: TranscriptSegment[] = [];

  if (paragraphs.length > 0) {
    for (const p of paragraphs) {
      const text = p.sentences.map((s: any) => s.text).join(" ");
      const pWords = allWords
        .filter((w: any) => w.start >= p.start && w.end <= p.end + 0.1)
        .map((w: any) => ({
          word: w.word,
          startMs: Math.round(w.start * 1000),
          endMs: Math.round(w.end * 1000),
        }));
      segments.push({
        text,
        startMs: Math.round(p.start * 1000),
        endMs: Math.round(p.end * 1000),
        words: pWords,
      });
    }
  } else if (allWords.length > 0) {
    // Fallback: chunk by pause / max words
    const PAUSE_THRESHOLD_S = 0.4;
    const MAX_WORDS_PER_SEGMENT = 8;
    let chunkWords: any[] = [];
    let chunkStart = allWords[0].start;
    let prevEnd = allWords[0].end;

    for (let i = 0; i < allWords.length; i++) {
      const w = allWords[i];
      const gap = i > 0 ? w.start - prevEnd : 0;
      const shouldSplit =
        chunkWords.length > 0 &&
        (gap > PAUSE_THRESHOLD_S || chunkWords.length >= MAX_WORDS_PER_SEGMENT);

      if (shouldSplit) {
        segments.push({
          text: chunkWords.map((x) => x.word).join(" "),
          startMs: Math.round(chunkStart * 1000),
          endMs: Math.round(prevEnd * 1000),
          words: chunkWords.map((x) => ({
            word: x.word,
            startMs: Math.round(x.start * 1000),
            endMs: Math.round(x.end * 1000),
          })),
        });
        chunkWords = [];
        chunkStart = w.start;
      }

      chunkWords.push(w);
      prevEnd = w.end;
    }

    if (chunkWords.length > 0) {
      segments.push({
        text: chunkWords.map((x) => x.word).join(" "),
        startMs: Math.round(chunkStart * 1000),
        endMs: Math.round(prevEnd * 1000),
        words: chunkWords.map((x) => ({
          word: x.word,
          startMs: Math.round(x.start * 1000),
          endMs: Math.round(x.end * 1000),
        })),
      });
    }
  }

  return segments;
}
