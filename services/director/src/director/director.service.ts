import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlannerService } from '../planner/planner.service';
import { ExecutorService } from '../executor/executor.service';
import { SessionService } from '../session/session.service';
import { ConfirmationGateService } from '../executor/confirmation-gate.service';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { BroadcastService } from '../broadcast/broadcast.service';

@Injectable()
export class DirectorService {
  private readonly logger = new Logger(DirectorService.name);

  constructor(
    private planner: PlannerService,
    private executor: ExecutorService,
    private session: SessionService,
    private gate: ConfirmationGateService,
    private broadcastService: BroadcastService,
  ) {}

  /**
   * Main entry point for a user chat request.
   */
  async handleUserRequest(projectId: string, userId: string, text: string): Promise<void> {
    this.logger.log(`Handling request from ${userId} for project ${projectId}: ${text}`);
    
    // 1. Get Session & History
    const sessionId = await this.session.getOrCreateSession(projectId, userId);
    const history = await this.session.getHistory(sessionId);
    
    // 2. Generate Plan
    try {
      const plan = await this.planner.generatePlan(projectId, sessionId, text, history);
      
      // Save interaction to history
      await this.session.appendMessages(sessionId, [
        new HumanMessage(text),
        new AIMessage(`I created a plan: ${plan.goal}`),
      ]);

      // 3. Confirm or Execute
      if (plan.requiresConfirmation) {
        await this.gate.requestConfirmation(projectId, sessionId, plan);
      } else {
        await this.executor.executePlan(projectId, plan);
      }
    } catch (error) {
      this.logger.error(`Failed to handle user request`, error);
      this.broadcastService.broadcast(projectId, {
        type: 'error',
        code: 'PLAN_GENERATION_FAILED',
        message: 'I had trouble understanding that request. Could you rephrase?',
      });
    }
  }

  /**
   * Handles user confirming a pending plan.
   */
  async handlePlanConfirmation(projectId: string, userId: string, planId: string): Promise<void> {
    const sessionId = await this.session.getOrCreateSession(projectId, userId);
    const plan = await this.gate.consumePendingPlan(sessionId, planId);
    
    if (plan) {
      await this.executor.executePlan(projectId, plan);
    } else {
      this.logger.warn(`Plan ${planId} not found or already consumed`);
    }
  }

  /**
   * Handles user rejecting a pending plan.
   */
  async handlePlanRejection(projectId: string, userId: string, planId: string): Promise<void> {
    const sessionId = await this.session.getOrCreateSession(projectId, userId);
    await this.gate.consumePendingPlan(sessionId, planId); // Just consume it and discard
    this.logger.log(`Plan ${planId} rejected by user`);
  }
}
