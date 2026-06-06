import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { getDB, space } from "@openvideo/db";
import { router, protectedProcedure } from "../trpc.js";
import { GoogleGenAI } from "@google/genai";

const db = getDB();

export const chatRouter = router({
  send: protectedProcedure
    .input(
      z.object({
        spaceId: z.string(),
        message: z.string(),
        limit: z.number().optional().default(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Verify space access
      const spaceExists = await db.query.space.findFirst({
        where: and(eq(space.id, input.spaceId), eq(space.userId, ctx.user.id)),
      });

      if (!spaceExists) {
        throw new Error("Space not found or unauthorized");
      }

      // 2. Initialize Gemini
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error("Chat service not configured - GOOGLE_API_KEY missing");
      }
      const ai = new GoogleGenAI({ apiKey });

      // 3. Generate Embedding for the query
      const formattedQuery = `task: search result | query: ${input.message}`;
      const embedResponse = await ai.models.embedContent({
        model: "gemini-embedding-2",
        contents: formattedQuery,
      });

      const embedding = embedResponse.embeddings?.[0]?.values;
      if (!embedding) {
        throw new Error("Failed to generate embedding for the chat query");
      }

      const vectorStr = `[${embedding.join(",")}]`;

      // 4. Similarity search via pgvector
      const searchResult = await db.execute(sql`
        SELECT document, cmetadata
        FROM langchain_pg_embedding
        WHERE cmetadata->>'spaceId' = ${input.spaceId}
        ORDER BY embedding <=> ${vectorStr}::vector
        LIMIT ${input.limit}
      `);
      const docs = searchResult.rows as unknown as Array<{ document: string; cmetadata: any }>;

      // 5. Build context prompt
      const contextText = docs
        .map((doc, i) => {
          const meta = doc.cmetadata;
          return `[${i + 1}] ${meta?.assetName || "Unknown"} (${meta?.assetType || "Unknown"}): ${doc.document}`;
        })
        .join("\n\n");

      const prompt = `You are a helpful assistant for video editing. Answer the user's question based on the following retrieved content from their video assets.

Retrieved Context:
${contextText}

User Question: ${input.message}

Provide a helpful, concise answer. Reference specific assets and timestamps when relevant.`;

      // 6. Generate answer
      const geminiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const answer = geminiResponse.text || "No response generated.";

      // 7. Format sources
      const sources = docs.map((doc) => ({
        assetId: doc.cmetadata?.assetId as string,
        assetName: doc.cmetadata?.assetName as string,
        assetType: doc.cmetadata?.assetType as string,
        text: doc.document,
        startMs: doc.cmetadata?.startMs as number | undefined,
        endMs: doc.cmetadata?.endMs as number | undefined,
        layer: doc.cmetadata?.layer as string,
      }));

      return {
        message: answer,
        spaceId: input.spaceId,
        sources,
      };
    }),
});
