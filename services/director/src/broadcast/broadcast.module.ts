import { Module } from '@nestjs/common';
import { BroadcastService } from './broadcast.service';

@Module({
  providers: [BroadcastService],
  exports: [BroadcastService],
})
export class BroadcastModule {}
