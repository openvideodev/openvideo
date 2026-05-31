import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { SpacesService } from "./spaces.service";
import { SpacesController } from "./spaces.controller";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "index-project",
    }),
  ],
  controllers: [SpacesController],
  providers: [SpacesService],
  exports: [SpacesService],
})
export class SpacesModule {}
