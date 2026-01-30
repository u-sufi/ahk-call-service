import { Module } from '@nestjs/common';
import { CdrController } from './cdr.controller';
import { CdrService } from './cdr.service';
import { CdrHandlerService } from './cdr-handler.service';
import { CallModule } from '../call/call.module';

@Module({
  imports: [CallModule],
  controllers: [CdrController],
  providers: [CdrService, CdrHandlerService],
  exports: [CdrService],
})
export class CdrModule {}
