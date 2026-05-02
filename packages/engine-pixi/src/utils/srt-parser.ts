/**
 * Parse SRT subtitle format
 * Returns array of subtitle segments with start, end, and text
 */

export interface SubtitleSegment {
  start: number; // in microseconds
  end: number; // in microseconds
  text: string;
}

/**
 * Convert SRT time format to seconds
 * Format: HH:MM:SS,mmm
 */
function srtTimeToSeconds(time: string): number {
  const match = time.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
  if (match == null) throw Error(`time format error: ${time}`);

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number(match[4]);

  return hours * 60 * 60 + minutes * 60 + seconds + milliseconds / 1000;
}

/**
 * Parse SRT subtitle content into segments
 * @param srt SRT file content as string
 * @returns Array of subtitle segments
 */
export function parseSrt(srt: string): SubtitleSegment[] {
  return (
    srt
      .split(/\r|\n/)
      .map((s) => s.trim())
      .filter((str) => str.length > 0)
      // Match timestamp marker lines, unmatched lines are subtitle content
      .map((s) => ({
        lineStr: s,
        match: s.match(
          /(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/
        ),
      }))
      // Filter out numeric markers above timestamps
      .filter(
        ({ lineStr }, idx, source) =>
          !(/^\d+$/.test(lineStr) && source[idx + 1]?.match != null)
      )
      // Aggregate by timestamp marker lines, concatenate subtitle content into text field
      .reduce((acc, { lineStr, match }) => {
        if (match == null) {
          const last = acc.at(-1);
          if (last == null) return acc;

          last.text += last.text.length === 0 ? lineStr : `\n${lineStr}`;
        } else {
          acc.push({
            start: srtTimeToSeconds(match[1]) * 1e6, // Convert to microseconds
            end: srtTimeToSeconds(match[2]) * 1e6, // Convert to microseconds
            text: '',
          });
        }

        return acc;
      }, [] as SubtitleSegment[])
  );
}
