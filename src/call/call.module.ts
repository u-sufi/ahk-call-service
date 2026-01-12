import { Module } from '@nestjs/common';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { EslService } from './esl.service';

@Module({
  controllers: [CallsController],
  providers: [CallsService, EslService],
  exports: [CallsService, EslService],
})
export class CallModule {}
