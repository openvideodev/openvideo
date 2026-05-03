import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

@Injectable()
export class EmbedderService {
  private embedder: GoogleGenerativeAIEmbeddings;

  constructor(private configService: ConfigService) {
    this.embedder = new GoogleGenerativeAIEmbeddings({
      modelName: 'embedding-001',
      apiKey: this.configService.get<string>('GOOGLE_API_KEY'),
    });
  }

  getEmbeddings() {
    return this.embedder;
  }
}
