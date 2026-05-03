import { Injectable } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';
import { TranscriptSegment } from './transcriber.service';

@Injectable()
export class ChunkerService {
  private splitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 100,
    });
  }

  async chunk(projectId: string, segments: TranscriptSegment[]): Promise<Document[]> {
    const docs: Document[] = [];

    // Group segments into larger chunks before splitting, or split each segment
    // Since segments might be small (e.g. 5 seconds), it's often better to join them
    // and then split, keeping track of timestamps.
    // For simplicity, we'll split each segment here.
    
    for (const segment of segments) {
      const splitTexts = await this.splitter.splitText(segment.text);
      
      splitTexts.forEach((text) => {
        docs.push(new Document({
          pageContent: text,
          metadata: {
            projectId,
            clipId: segment.clipId,
            layer: 'transcript',
            startMs: segment.startMs,
            endMs: segment.endMs,
          },
        }));
      });
    }

    return docs;
  }
}
