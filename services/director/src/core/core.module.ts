import { Module } from '@nestjs/common';
import { CoreRegistryService } from './core-registry.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  providers: [CoreRegistryService],
  exports: [CoreRegistryService],
})
export class CoreModule {}
