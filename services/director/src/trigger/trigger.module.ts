import { Module } from '@nestjs/common';
import { TriggerService } from './trigger.service';

@Module({
  providers: [TriggerService],
  exports: [TriggerService],
})
export class TriggerModule {}
