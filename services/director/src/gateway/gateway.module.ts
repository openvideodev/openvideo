import { Module } from '@nestjs/common';
import { DirectorGateway } from './director.gateway';
import { CoreModule } from '../core/core.module';
import { AuthModule } from '../auth/auth.module';
import { DirectorModule } from '../director/director.module';

import { BroadcastModule } from '../broadcast/broadcast.module';

@Module({
  imports: [CoreModule, AuthModule, DirectorModule, BroadcastModule],
  providers: [DirectorGateway],
  exports: [DirectorGateway],
})
export class GatewayModule {}
