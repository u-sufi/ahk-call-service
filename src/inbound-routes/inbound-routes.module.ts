import { Module } from '@nestjs/common';
import { InboundRoutesController } from './inbound-routes.controller';
import { InboundRoutesService } from './inbound-routes.service';
import { CallModule } from '../call/call.module';

@Module({
  imports: [CallModule],
  controllers: [InboundRoutesController],
  providers: [InboundRoutesService],
  exports: [InboundRoutesService],
})
export class InboundRoutesModule {}
