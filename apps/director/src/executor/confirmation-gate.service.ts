import { getDB, schema, eq, and } from "@openvideo/db";
const db = getDB();

import { Injectable, Logger } from "@nestjs/common";
import { Plan } from "../types/plan.types";
import { BroadcastService } from "../broadcast/broadcast.service";

@Injectable()
export class ConfirmationGateService {
  private readonly logger = new Logger(ConfirmationGateService.name);

  constructor(private broadcastService: BroadcastService) {}

  async requestConfirmation(projectId: string, sessionId: string, plan: Plan): Promise<void> {
    this.logger.log(`Requesting confirmation for plan ${plan.id} (Project ${projectId})`);

    await db
      .update(schema.directorSession)
      .set({ pendingPlan: plan, updatedAt: new Date() })
      .where(eq(schema.directorSession.id, sessionId));

    this.broadcastService.broadcast(projectId, {
      type: "plan.created",
      plan,
    });
  }

  async getPendingPlan(sessionId: string): Promise<Plan | null> {
    const [session] = await db
      .select()
      .from(schema.directorSession)
      .where(eq(schema.directorSession.id, sessionId))
      .limit(1);

    return (session?.pendingPlan as Plan) || null;
  }

  async consumePendingPlan(sessionId: string, planId: string): Promise<Plan | null> {
    const [session] = await db
      .select()
      .from(schema.directorSession)
      .where(eq(schema.directorSession.id, sessionId))
      .limit(1);

    if (!session?.pendingPlan) return null;

    const plan = session.pendingPlan as Plan;
    if (plan.id !== planId) return null;

    await db
      .update(schema.directorSession)
      .set({ pendingPlan: null, updatedAt: new Date() })
      .where(eq(schema.directorSession.id, sessionId));

    return plan;
  }
}
