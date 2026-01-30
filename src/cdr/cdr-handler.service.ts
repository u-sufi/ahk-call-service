import { Injectable, OnModuleInit } from '@nestjs/common';
import { EslService, CdrEvent } from '../call/esl.service';
import { CdrService } from './cdr.service';
import { LoggerService } from '../logger';

/**
 * CDR Handler Service
 * Automatically captures call records from FreeSWITCH ESL events
 */
@Injectable()
export class CdrHandlerService implements OnModuleInit {
  constructor(
    private readonly eslService: EslService,
    private readonly cdrService: CdrService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(CdrHandlerService.name);
  }

  onModuleInit() {
    this.startCdrHandler();
  }

  private startCdrHandler() {
    // Register callback for call end events
    this.eslService.onCallEnd((cdr: CdrEvent) => {
      void this.handleCdrEvent(cdr);
    });

    this.logger.log('CDR handler started - listening for call events');
  }

  private async handleCdrEvent(cdr: CdrEvent): Promise<void> {
    try {
      await this.cdrService.create({
        uuid: cdr.uuid,
        callerIdName: cdr.callerIdName,
        callerIdNumber: cdr.callerIdNumber,
        destinationNumber: cdr.destinationNumber,
        direction: cdr.direction as 'inbound' | 'outbound' | undefined,
        startTime: cdr.startTime,
        answerTime: cdr.answerTime,
        endTime: cdr.endTime,
        duration: cdr.duration,
        billsec: cdr.billsec,
        hangupCause: cdr.hangupCause,
      });
      this.logger.log(`CDR captured: ${cdr.uuid} (${cdr.hangupCause})`);
    } catch (error) {
      this.logger.error(
        `Failed to save CDR: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
