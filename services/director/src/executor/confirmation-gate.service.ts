import { Injectable, Logger } from "@nestjs/common";
import { Plan } from "../types/plan.types";
import { BroadcastService } from "../broadcast/broadcast.service";
import { DrizzleService } from "../db/drizzle.service";

@Injectable()
export class ConfirmationGateService {
  private readonly logger = new Logger(ConfirmationGateService.name);

  constructor(
    private broadcastService: BroadcastService,
    private db: DrizzleService,
  ) {}

  async requestConfirmation(projectId: string, sessionId: string, plan: Plan): Promise<void> {
    this.logger.log(`Requesting confirmation for plan ${plan.id} (Project ${projectId})`);

    await this.db.updateSessionPendingPlan(sessionId, plan);

    this.broadcastService.broadcast(projectId, {
      type: "plan.created",
      plan,
    });
  }

  async getPendingPlan(sessionId: string): Promise<Plan | null> {
    const session = await this.db.findSessionById(sessionId);
    return (session?.pendingPlan as Plan) || null;
  }

  async consumePendingPlan(sessionId: string, planId: string): Promise<Plan | null> {
    const session = await this.db.findSessionById(sessionId);

    if (!session?.pendingPlan) return null;

    const plan = session.pendingPlan as Plan;
    if (plan.id !== planId) return null;

    await this.db.updateSessionPendingPlan(sessionId, null);

    return plan;
  }
}
