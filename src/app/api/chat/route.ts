import { streamText, convertToModelMessages, type UIMessage, tool } from 'ai';
import { z } from 'zod';
import { google, type GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google('gemini-3-pro-preview'),
    messages: convertToModelMessages(messages),
    providerOptions: {
      google: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: 'low',
        },
      } satisfies GoogleGenerativeAIProviderOptions,
    },
    tools: {
      add_text: tool({
        description: 'Add a text element to the video timeline',
        inputSchema: z.object({
          text: z.string().describe('The text content to display'),
        }),
        execute: async ({ text }) => {
          return `Text added: ${text}`;
        },
      }),
      delete_selected: tool({
        description: 'Delete the currently selected objects from the timeline',
        inputSchema: z.object({}),
        execute: async () => {
          return 'Delete action triggered for selected objects';
        },
      }),
      duplicate_selected: tool({
        description: 'Duplicate the currently selected objects in the timeline',
        inputSchema: z.object({}),
        execute: async () => {
          return 'Duplicate action triggered for selected objects';
        },
      }),
      split_selected: tool({
        description:
          'Split the selected object at the current time or provided time',
        inputSchema: z.object({
          time: z
            .number()
            .optional()
            .describe('The time in seconds to split at'),
        }),
        execute: async ({ time }) => {
          return `Split action triggered for selected object${time ? ` at ${time} seconds` : ''}`;
        },
      }),
      trim_selected: tool({
        description:
          'Trim the selected clip from a specified time (removes the beginning of the clip)',
        inputSchema: z.object({
          trimFrom: z
            .number()
            .describe(
              'The number of seconds to trim from the start of the clip'
            ),
        }),
        execute: async ({ trimFrom }) => {
          return `Trim action triggered for selected clip: trimming ${trimFrom} seconds from the start`;
        },
      }),
      set_color: tool({
        description: 'Set the color of the currently selected objects',
        inputSchema: z.object({
          color: z
            .string()
            .describe('The color to set (e.g. "red", "#ff0000")'),
        }),
        execute: async ({ color }) => {
          return `Color set action triggered for selected objects: ${color}`;
        },
      }),
      set_timings: tool({
        description:
          'Set the display timings (start and end) for the currently selected objects',
        inputSchema: z.object({
          from: z.number().optional().describe('The start time in seconds'),
          to: z.number().optional().describe('The end time in seconds'),
        }),
        execute: async ({ from, to }) => {
          return `Timings set action triggered for selected objects: from ${from ?? 'unchanged'} to ${to ?? 'unchanged'}`;
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
}
