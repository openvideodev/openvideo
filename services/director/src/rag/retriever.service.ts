import { Injectable, Logger } from '@nestjs/common';
import { VectorStoreService } from './vector-store.service';

@Injectable()
export class RetrieverService {
  private readonly logger = new Logger(RetrieverService.name);

  constructor(private vectorStore: VectorStoreService) {}

  /**
   * Searches the vector store across both 'metadata' and 'transcript' layers.
   * Formats the results into a string block suitable for the system prompt.
   */
  async search(projectId: string, query: string, topK = 10): Promise<string> {
    this.logger.debug(`Retrieving context for query: "${query}" in project ${projectId}`);
    
    let docs: any[] = [];
    try {
      docs = await this.vectorStore.similaritySearch(query, topK, projectId);
    } catch (err) {
      // RAG is optional — if no content is indexed yet, just return empty context
      this.logger.debug(`RAG search skipped (no indexed content yet): ${err.message}`);
      return 'No project context indexed yet.';
    }
    
    if (docs.length === 0) {
      return 'No relevant project context found.';
    }

    let contextString = '--- RELEVANT PROJECT CONTEXT ---\n\n';
    
    docs.forEach((doc, index) => {
      const isTranscript = doc.metadata.layer === 'transcript';
      const label = isTranscript ? '[Transcript Segment]' : '[Structural Metadata]';
      
      contextString += `${index + 1}. ${label}\n`;
      contextString += `${doc.pageContent}\n`;
      
      if (isTranscript && doc.metadata.startMs !== undefined && doc.metadata.endMs !== undefined) {
        contextString += `Time Range: ${doc.metadata.startMs}ms - ${doc.metadata.endMs}ms\n`;
        contextString += `Clip ID: ${doc.metadata.clipId}\n`;
      } else {
        contextString += `Entity ID: ${doc.metadata.entityId} (${doc.metadata.entityType})\n`;
      }
      
      contextString += '\n';
    });

    return contextString;
  }
}
