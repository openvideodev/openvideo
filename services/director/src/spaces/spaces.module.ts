import { Module } from "@nestjs/common";
import { SpacesController } from "./spaces.controller";
import { SpacesService } from "./spaces.service";
import { DbModule } from "../db/db.module";

@Module({
  imports: [DbModule],
  controllers: [SpacesController],
  providers: [SpacesService],
  exports: [SpacesService],
})
export class SpacesModule {}
