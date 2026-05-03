import { Module } from '@nestjs/common';
import { PlannerService } from './planner.service';
import { SystemPromptService } from './system-prompt.service';
import { PlanValidatorService } from './plan-validator.service';
import { RagModule } from '../rag/rag.module';
import { SkillsModule } from '../skills/skills.module';

@Module({
  imports: [RagModule, SkillsModule],
  providers: [PlannerService, SystemPromptService, PlanValidatorService],
  exports: [PlannerService],
})
export class PlannerModule {}
