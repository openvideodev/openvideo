import { Module } from "@nestjs/common";
import { SessionService } from "./session.service";

@Module({
  imports: [],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
