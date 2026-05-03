import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
