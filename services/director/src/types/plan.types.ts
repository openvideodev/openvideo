import { Command } from '@openvideo/core';

export interface PlanStep {
  id: string;
  type: 'command' | 'skill' | 'generate';
  description: string;
  command?: Command;
  skillName?: string;
  skillParams?: Record<string, any>;
  jobType?: 'generate-audio' | 'generate-image';
  jobParams?: Record<string, any>;
}

export interface Plan {
  id: string;
  sessionId: string;
  goal: string;
  steps: PlanStep[];
  requiresConfirmation: boolean;
  estimatedSteps: number;
}
