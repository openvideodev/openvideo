import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';
import { CoreModule } from './core/core.module';
import { GatewayModule } from './gateway/gateway.module';
import { RagModule } from './rag/rag.module';
import { SkillsModule } from './skills/skills.module';
import { PlannerModule } from './planner/planner.module';
import { ExecutorModule } from './executor/executor.module';
import { QueueModule } from './queue/queue.module';
import { AssetsModule } from './assets/assets.module';
import { ProjectModule } from './project/project.module';
import { SessionModule } from './session/session.module';
import { DirectorModule } from './director/director.module';
import { HealthController } from './health/health.controller';
import { TriggerModule } from './trigger/trigger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    DbModule,
    CoreModule,
    GatewayModule,
    RagModule,
    SkillsModule,
    PlannerModule,
    ExecutorModule,
    QueueModule,
    AssetsModule,
    ProjectModule,
    SessionModule,
    DirectorModule,
    TriggerModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
