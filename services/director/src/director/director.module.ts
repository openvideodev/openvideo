import { Module } from '@nestjs/common';
import { DirectorService } from './director.service';
import { PlannerModule } from '../planner/planner.module';
import { ExecutorModule } from '../executor/executor.module';
import { SessionModule } from '../session/session.module';
import { BroadcastModule } from '../broadcast/broadcast.module';

@Module({
  imports: [
    PlannerModule,
    ExecutorModule,
    SessionModule,
    BroadcastModule,
  ],
  providers: [DirectorService],
  exports: [DirectorService],
})
export class DirectorModule {}
