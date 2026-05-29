import { Module } from "@nestjs/common";
import { BroadcastService } from "./broadcast.service";
import { RedisPubSubService } from "./redis-pubsub.service";
import { CoreModule } from "../core/core.module";

@Module({
  imports: [CoreModule],
  providers: [BroadcastService, RedisPubSubService],
  exports: [BroadcastService],
})
export class BroadcastModule {}
