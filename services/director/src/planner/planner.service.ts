import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { SystemMessage, HumanMessage, BaseMessage } from '@langchain/core/messages';
import { RetrieverService } from '../rag/retriever.service';
import { SystemPromptService } from './system-prompt.service';
import { PlanValidatorService } from './plan-validator.service';
import { Plan } from '../types/plan.types';

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);
  private model: ChatGoogleGenerativeAI;

  constructor(
    private configService: ConfigService,
    private retriever: RetrieverService,
    private promptService: SystemPromptService,
    private validator: PlanValidatorService,
  ) {
    this.model = new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.0-flash',
      apiKey: this.configService.get<string>('GOOGLE_API_KEY'),
      temperature: 0.2, // Low temp for more deterministic JSON
    });
  }

  async generatePlan(
    projectId: string,
    sessionId: string,
    userRequest: string,
    history: BaseMessage[] = []
  ): Promise<Plan> {
    this.logger.log(`Generating plan for project ${projectId}, request: "${userRequest}"`);

    // 1. Retrieve RAG context
    const contextString = await this.retriever.search(projectId, userRequest);

    // 2. Build system prompt
    const systemPrompt = this.promptService.build(contextString);

    // 3. Assemble messages
    const messages = [
      new SystemMessage(systemPrompt),
      ...history,
      new HumanMessage(userRequest),
    ];

    // 4. Call Gemini
    const response = await this.model.invoke(messages);
    let content = response.content as string;

    // 5. Clean markdown if present
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    // 6. Validate and parse
    return this.validator.validate(content, sessionId);
  }
}
