import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { SystemMessage, HumanMessage, BaseMessage, ToolMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { RetrieverService } from '../rag/retriever.service';
import { SystemPromptService } from './system-prompt.service';
import { PlanValidatorService } from './plan-validator.service';
import { CoreRegistryService } from '../core/core-registry.service';
import { SkillRegistryService } from '../skills/skill-registry.service';
import { Plan } from '../types/plan.types';

const MAX_TOOL_ITERATIONS = 5;

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);
  private model: ChatGoogleGenerativeAI;

  constructor(
    private configService: ConfigService,
    private retriever: RetrieverService,
    private promptService: SystemPromptService,
    private validator: PlanValidatorService,
    private coreRegistry: CoreRegistryService,
    private skillRegistry: SkillRegistryService,
  ) {
    this.model = new ChatGoogleGenerativeAI({
      modelName: 'gemini-3-flash-preview',
      apiKey: this.configService.get<string>('GOOGLE_API_KEY'),
      temperature: 0.1, // Lower temperature for more stable plan generation
    });
  }

  async generatePlan(
    projectId: string,
    sessionId: string,
    userRequest: string,
    history: BaseMessage[] = [],
  ): Promise<Plan> {
    this.logger.log(`Generating plan for project ${projectId}: "${userRequest}"`);

    // --- Define tools as closures over projectId ---

    const searchContextTool = tool(
      async ({ query }: { query: string }) => {
        this.logger.debug(`[Tool] search_project_context("${query}")`);
        return this.retriever.search(projectId, query);
      },
      {
        name: 'search_project_context',
        description:
          'Search indexed video transcripts and clip metadata using semantic similarity. ' +
          'Call this when the user references specific spoken content or needs to find clips by their dialogue.',
        schema: z.object({
          query: z.string().describe('Semantic search query'),
        }),
      },
    );

    const getProjectStateTool = tool(
      async () => {
        this.logger.debug(`[Tool] get_project_state()`);
        try {
          const core = await this.coreRegistry.get(projectId);
          const snapshot = core.getSnapshot();
          return JSON.stringify(
            {
              settings: snapshot.settings,
              trackCount: snapshot.tracks.length,
              clipCount: Object.keys(snapshot.clips).length,
              tracks: snapshot.tracks.map((t) => ({
                id: t.id,
                name: t.name,
                type: t.type,
                clipIds: t.clipIds,
              })),
              clips: Object.entries(snapshot.clips).map(([id, clip]) => ({
                id,
                type: (clip as any).type,
                display: (clip as any).display,
                duration: (clip as any).duration,
              })),
            },
            null,
            2,
          );
        } catch (err) {
          return 'Project state not available yet (empty project).';
        }
      },
      {
        name: 'get_project_state',
        description:
          'Get the current project structure: all tracks, clips, their IDs and timing. ' +
          'Call this when you need clip IDs for editing commands OR when the user asks questions about the project (e.g. what clips exist).',
        schema: z.object({}),
      },
    );

    const readSkillDocTool = tool(
      async ({ skillName }: { skillName: string }) => {
        this.logger.debug(`[Tool] read_skill_documentation("${skillName}")`);
        const doc = this.skillRegistry.getSkillDocumentation(skillName);
        return doc || `Skill "${skillName}" documentation not found.`;
      },
      {
        name: 'read_skill_documentation',
        description:
          'Read the full technical documentation and instructions for a specific editing skill. ' +
          'Call this when you want to use a skill but need to understand its parameters or exact effects.',
        schema: z.object({
          skillName: z.string().describe('The name of the skill to look up'),
        }),
      },
    );

    const tools = [searchContextTool, getProjectStateTool, readSkillDocTool];
    const modelWithTools = this.model.bindTools(tools);

    // --- Build initial messages ---
    const messages: BaseMessage[] = [
      new SystemMessage(this.promptService.build()),
      ...history,
      new HumanMessage(userRequest),
    ];

    // --- Agentic tool-calling loop ---
    let response = await modelWithTools.invoke(messages);
    const conversationMessages = [...messages];
    let iterations = 0;

    while (
      response.tool_calls &&
      response.tool_calls.length > 0 &&
      iterations < MAX_TOOL_ITERATIONS
    ) {
      this.logger.debug(
        `Tool-call iteration ${iterations + 1}: [${response.tool_calls.map((tc) => tc.name).join(', ')}]`,
      );

      conversationMessages.push(response);

      const toolResults: ToolMessage[] = [];
      for (const toolCall of response.tool_calls) {
        let result: any;
        try {
          if (toolCall.name === 'search_project_context') {
            result = await searchContextTool.invoke(toolCall.args as any);
          } else if (toolCall.name === 'get_project_state') {
            result = await getProjectStateTool.invoke({} as any);
          } else if (toolCall.name === 'read_skill_documentation') {
            result = await readSkillDocTool.invoke(toolCall.args as any);
          } else {
            result = `Unknown tool: ${toolCall.name}`;
          }
        } catch (err) {
          result = `Tool execution error: ${(err as Error).message}`;
        }
        
        const content = typeof result === 'string' ? result : (result as any).content || JSON.stringify(result);
        toolResults.push(new ToolMessage({ content, tool_call_id: toolCall.id! }));
      }

      conversationMessages.push(...toolResults);
      response = await modelWithTools.invoke(conversationMessages);
      iterations++;
    }

    // --- Parse final response as Plan ---
    let content = response.content as string;
    // Clean up markdown block if present
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    return this.validator.validate(content, sessionId);
  }
}
