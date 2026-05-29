import { Module, forwardRef } from "@nestjs/common";
import { ExecutorService } from "./executor.service";
import { CommandBuilderService } from "./command-builder.service";
import { ConfirmationGateService } from "./confirmation-gate.service";
import { CoreModule } from "../core/core.module";
import { SkillsModule } from "../skills/skills.module";
import { BroadcastModule } from "../broadcast/broadcast.module";
import { QueueModule } from "../queue/queue.module";
import { DbModule } from "../db/db.module";
import { TriggerModule } from "../trigger/trigger.module";

@Module({
  imports: [CoreModule, SkillsModule, BroadcastModule, QueueModule, DbModule, TriggerModule],
  providers: [ExecutorService, CommandBuilderService, ConfirmationGateService],
  exports: [ExecutorService, ConfirmationGateService],
})
export class ExecutorModule {}
