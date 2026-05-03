import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [QueueModule],
  controllers: [ProjectController],
})
export class ProjectModule {}
