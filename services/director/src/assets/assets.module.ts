import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [AssetsController],
})
export class AssetsModule {}
