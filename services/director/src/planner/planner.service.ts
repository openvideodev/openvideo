import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { RetrieverService } from "../rag/retriever.service";
import { SystemPromptService } from "./system-prompt.service";
import { PlanValidatorService } from "./plan-validator.service";
import { CoreRegistryService } from "../core/core-registry.service";
import { SkillRegistryService } from "../skills/skill-registry.service";
import { Plan } from "../types/plan.types";
import { AssetsService } from "../assets/assets.service";

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
    private assetsService: AssetsService,
  ) {
    this.model = new ChatGoogleGenerativeAI({
      modelName: "gemini-3-flash-preview",
      apiKey: this.configService.get<string>("GOOGLE_API_KEY"),
      temperature: 0.1, // Lower temperature for more stable plan generation
    });
  }

  async generatePlan(
    spaceId: string,
    sessionId: string,
    userRequest: string,
    history: BaseMessage[] = [],
  ): Promise<Plan> {
    this.logger.log(`Generating plan for space ${spaceId}: "${userRequest}"`);

    // --- Define tools as closures over spaceId ---

    const searchContextTool = tool(
      async ({ query, topK }: { query: string; topK?: number }) => {
        this.logger.debug(`[Tool] search_space_context("${query}", topK=${topK ?? 10})`);
        return this.retriever.search(spaceId, query, topK ?? 10);
      },
      {
        name: "search_space_context",
        description:
          "Search indexed asset content using semantic similarity. This includes video transcripts (speech), " +
          "visual scene descriptions (what is visible on screen, objects, actions, settings), image descriptions, " +
          "and clip metadata. Call this whenever the user asks about video content, scenes, what happens at a timestamp, " +
          "people or objects in a video, or requests a summary of any asset. " +
          "Use topK=20 or higher when the user asks to find ALL matching segments (e.g. 'find all interview segments').",
        schema: z.object({
          query: z.string().describe("Semantic search query"),
          topK: z
            .number()
            .optional()
            .describe(
              "Number of results to return (default 10, use 20-30 for exhaustive searches)",
            ),
        }),
      },
    );

    const getSpaceStateTool = tool(
      async () => {
        this.logger.debug(`[Tool] get_space_state()`);

        let availableAssets: any[] = [];
        try {
          const assets = await this.assetsService.findAssetsBySpace(spaceId);
          availableAssets = assets.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            src: a.src,
            duration: a.duration,
          }));
        } catch (assetsErr: any) {
          this.logger.warn(`Failed to fetch available assets: ${assetsErr.message}`);
        }

        try {
          const core = await this.coreRegistry.get(spaceId);
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
              clips: Object.entries(snapshot.clips).map(([id, c]) => {
                const clip = c as any;
                return {
                  id,
                  type: clip.type,
                  timing: clip.timing,
                  transform: clip.transform,
                  text: clip.text,
                  style: clip.style,
                  src: clip.src,
                  effectKey: clip.effectKey,
                  values: clip.values,
                  transitionKey: clip.transitionKey,
                  fromClipId: clip.fromClipId,
                  toClipId: clip.toClipId,
                  transition: clip.transition,
                };
              }),
              availableAssets,
            },
            null,
            2,
          );
        } catch (err) {
          return JSON.stringify(
            {
              message: "Project state not available yet (empty project).",
              availableAssets,
            },
            null,
            2,
          );
        }
      },
      {
        name: "get_space_state",
        description:
          "Get the current space structure: tracks, clips, and uploaded media assets. " +
          "Call this when you need clip IDs, active timeline structure, OR when the user asks questions about what media assets/files are available in the space.",
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
        name: "read_skill_documentation",
        description:
          "Read the full technical documentation and instructions for a specific editing skill. " +
          "Call this when you want to use a skill but need to understand its parameters or exact effects.",
        schema: z.object({
          skillName: z.string().describe("The name of the skill to look up"),
        }),
      },
    );

    const searchWordsTool = tool(
      async ({ phrase }: { phrase: string }) => {
        this.logger.debug(`[Tool] search_transcript_words("${phrase}")`);
        return this.retriever.searchWords(spaceId, phrase);
      },
      {
        name: "search_transcript_words",
        description:
          "Exact word or phrase lookup in video transcripts with word-level timestamp precision (~100ms). " +
          "Use this when the user asks for the exact timestamp of a specific word, phrase, or quote spoken in a video. " +
          "Returns the precise startMs and endMs of the matching words.",
        schema: z.object({
          phrase: z.string().describe("The exact word or phrase to find"),
        }),
      },
    );

    const searchAllTool = tool(
      async ({ query }: { query: string }) => {
        this.logger.debug(`[Tool] search_all_context("${query}")`);
        return this.retriever.searchAll(spaceId, query);
      },
      {
        name: "search_all_context",
        description:
          "Broad semantic search across ALL indexed assets in the space with higher recall. " +
          "Use this for general questions that span multiple files, summaries of everything, " +
          "or comparisons across assets (e.g. 'summarize all my videos', 'what topics are covered across my files').",
        schema: z.object({
          query: z.string().describe("The question or topic to search across all assets"),
        }),
      },
    );

    const tools = [
      searchContextTool,
      searchWordsTool,
      searchAllTool,
      getSpaceStateTool,
      readSkillDocTool,
    ];
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
        `Tool-call iteration ${iterations + 1}: [${response.tool_calls.map((tc) => tc.name).join(", ")}]`,
      );

      conversationMessages.push(response);

      const toolResults: ToolMessage[] = [];
      for (const toolCall of response.tool_calls) {
        let result: any;
        try {
          if (toolCall.name === "search_space_context") {
            result = await searchContextTool.invoke(toolCall.args as any);
          } else if (toolCall.name === "search_transcript_words") {
            result = await searchWordsTool.invoke(toolCall.args as any);
          } else if (toolCall.name === "search_all_context") {
            result = await searchAllTool.invoke(toolCall.args as any);
          } else if (toolCall.name === "get_space_state") {
            result = await getSpaceStateTool.invoke({} as any);
          } else if (toolCall.name === "read_skill_documentation") {
            result = await readSkillDocTool.invoke(toolCall.args as any);
          } else {
            result = `Unknown tool: ${toolCall.name}`;
          }
        } catch (err) {
          result = `Tool execution error: ${(err as Error).message}`;
        }

        const content =
          typeof result === "string" ? result : (result as any).content || JSON.stringify(result);
        toolResults.push(new ToolMessage({ content, tool_call_id: toolCall.id! }));
      }

      conversationMessages.push(...toolResults);
      response = await modelWithTools.invoke(conversationMessages);
      iterations++;
    }

    // --- Parse final response as Plan ---
    let content = response.content as string;
    // Clean up markdown block if present
    content = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return this.validator.validate(content, sessionId);
  }
}
