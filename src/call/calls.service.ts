import { BadRequestException, Injectable } from '@nestjs/common';
import { EslService } from './esl.service';
import { LoggerService } from '../logger';
import { FreeswitchConfig } from '../config';

@Injectable()
export class CallsService {
  constructor(
    private readonly esl: EslService,
    private readonly logger: LoggerService,
    private readonly fsConfig: FreeswitchConfig,
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

  /**
   * Initiate outbound call via Telnyx and then bridge to an internal agent user.
   * DevOps requested: replace &park() with &bridge(user/1000@<domain>)
   *
   * If agentExtension is omitted, uses FS_DEFAULT_AGENT_EXT.
   */
  async initiate(to: string, from?: string, agentExtension?: string) {
    const toE164 = to.replace(/[^\d+]/g, '');
    if (toE164.length < 10)
      throw new BadRequestException('Invalid "to" number');

    const fromE164 = from ? from.replace(/[^\d+]/g, '') : undefined;
    if (fromE164 && fromE164.length < 10) {
      throw new BadRequestException('Invalid "from" number');
    }

    const ext =
      (agentExtension && agentExtension.trim()) ||
      String(this.fsConfig.defaultAgentExtension);

    this.logger.log(
      `Originate (bridge) → to=${toE164} from=${fromE164 ?? 'default'} agent=${ext}@${this.fsConfig.domain}`,
    );
    const uuid = await this.esl.originateBridgeToUser(toE164, ext, fromE164);
    return {
      callUuid: uuid,
      to: toE164,
      from: fromE164 ?? null,
      agent: { extension: ext, domain: this.fsConfig.domain },
    };
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
