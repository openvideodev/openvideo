import { Injectable, Logger } from "@nestjs/common";
import { Plan } from "../types/plan.types";
import { z } from "zod";

const PlanSchema = z.object({
  goal: z.string().default("Plan Goal"),
  summary: z.string().optional(),
  requiresConfirmation: z.boolean().default(false),
  steps: z.array(
    z
      .object({
        id: z.string(),
        type: z.enum(["command", "skill", "generate", "chat"]),
        description: z.string(),
        command: z.record(z.any()).optional(),
        skillName: z.string().optional(),
        skillParams: z.record(z.any()).optional(),
        jobType: z
          .enum([
            "generate-audio",
            "generate-image",
            "generate-video",
            "generate-background-music",
            "generate-sound-effect",
          ])
          .optional(),
        jobParams: z.record(z.any()).optional(),
      })
      .refine(
        (data) => {
          if (data.type === "command" && !data.command) return false;
          if (data.type === "skill" && !data.skillName) return false;
          if (data.type === "generate" && (!data.jobType || !data.jobParams)) return false;
          return true;
        },
        { message: "Step is missing required fields for its type" },
      ),
  ),
});

@Injectable()
export class PlanValidatorService {
  private readonly logger = new Logger(PlanValidatorService.name);

  validate(jsonString: string, sessionId: string): Plan {
    try {
      const raw = JSON.parse(jsonString);
      const parsed = PlanSchema.parse(raw);

      return {
        id: `plan_${Date.now()}`,
        sessionId,
        goal: parsed.goal,
        summary: parsed.summary,
        requiresConfirmation: parsed.requiresConfirmation,
        steps: parsed.steps as any,
        estimatedSteps: parsed.steps.length,
      };
    } catch (e) {
      this.logger.warn(
        "AI returned non-JSON response, wrapping as chat plan. Content: " +
          jsonString.substring(0, 200),
      );
      // Fallback: treat plain text response as a chat answer
      return {
        id: `plan_${Date.now()}`,
        sessionId,
        goal: "Chat response",
        summary: jsonString,
        requiresConfirmation: false,
        steps: [],
        estimatedSteps: 0,
      };
    }
  }
}
