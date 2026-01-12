import { BadRequestException, Injectable } from '@nestjs/common';
import { EslService } from './esl.service';
import { LoggerService } from '../logger';

@Injectable()
export class CallsService {
  constructor(
    private readonly esl: EslService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(CallsService.name);
  }

  health() {
    return {
      connected: this.esl.isConnected,
      message: this.esl.isConnected
        ? 'Connected to FreeSWITCH ESL'
        : 'Not connected to FreeSWITCH ESL',
    };
  }

  async testEcho(destinationNumber: string) {
    const destinationE164 = destinationNumber.replace(/[^\d+]/g, '');
    if (destinationE164.length < 10) {
      throw new BadRequestException('Invalid destination number');
    }

    this.logger.log(`Echo test originate → ${destinationE164}`);
    const uuid = await this.esl.originateEcho(destinationE164);
    return { callUuid: uuid, destinationNumber: destinationE164 };
  }

  async initiate(to: string, from?: string) {
    const toE164 = to.replace(/[^\d+]/g, '');
    if (toE164.length < 10)
      throw new BadRequestException('Invalid "to" number');

    const fromE164 = from ? from.replace(/[^\d+]/g, '') : undefined;
    if (fromE164 && fromE164.length < 10) {
      throw new BadRequestException('Invalid "from" number');
    }

    this.logger.log(
      `Originate (park) → to=${toE164} from=${fromE164 ?? 'default'}`,
    );
    const uuid = await this.esl.originatePark(toE164, fromE164);
    return { callUuid: uuid, to: toE164, from: fromE164 ?? null };
  }

  async hangup(uuid: string) {
    await this.esl.hangup(uuid);
    return { success: true };
  }

  async status(uuid: string) {
    const exists = await this.esl.exists(uuid);
    return { callUuid: uuid, exists };
  }
}
