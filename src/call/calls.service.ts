import { BadRequestException, Injectable } from '@nestjs/common';
import { EslService } from './esl.service';
import { LoggerService } from '../logger';
import { FreeswitchConfig } from '../config';
import { PrismaService } from '../core/prisma';
import { DialDto } from './dto';

@Injectable()
export class CallsService {
  constructor(
    private readonly esl: EslService,
    private readonly logger: LoggerService,
    private readonly fsConfig: FreeswitchConfig,
    private readonly prisma: PrismaService,
  ) {
    this.logger.setContext(CallsService.name);
  }

  /**
   * Health check for ESL connection
   */
  health() {
    return {
      connected: this.esl.isConnected,
      message: this.esl.isConnected
        ? 'Connected to FreeSWITCH ESL'
        : 'Not connected to FreeSWITCH ESL',
    };
  }

  /**
   * Echo test for outbound calling
   */
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
   * Click-to-call: Initiate outbound call
   * First calls the agent, then bridges to the destination
   */
  async dial(dialDto: DialDto) {
    // Verify agent exists and is active
    const agent = await this.prisma.agent.findUnique({
      where: { extension: dialDto.agentExtension },
    });

    if (!agent || !agent.isActive) {
      throw new BadRequestException(
        `Agent with extension "${dialDto.agentExtension}" not found or inactive`,
      );
    }

    // Check if agent is online
    const isOnline = await this.esl.isExtensionOnline(dialDto.agentExtension);
    if (!isOnline) {
      throw new BadRequestException(
        `Agent ${dialDto.agentExtension} is not online`,
      );
    }

    // Format destination number
    let formattedDest = dialDto.destination.replace(/[^0-9+]/g, '');
    if (!formattedDest.startsWith('+')) {
      // Assume US number if no +
      if (formattedDest.length === 10) {
        formattedDest = '+1' + formattedDest;
      } else if (formattedDest.length === 11 && formattedDest.startsWith('1')) {
        formattedDest = '+' + formattedDest;
      }
    }

    this.logger.log(
      `Click-to-call: agent=${dialDto.agentExtension} → ${formattedDest}`,
    );

    const uuid = await this.esl.dialOut(
      dialDto.agentExtension,
      formattedDest,
      dialDto.callerIdNumber || this.fsConfig.telnyxCallerId,
      dialDto.callerIdName || agent.callerIdName || agent.name,
    );

    return {
      success: true,
      data: {
        uuid,
        status: 'calling_agent',
        agentExtension: dialDto.agentExtension,
        destination: formattedDest,
      },
    };
  }

  /**
   * Initiate outbound call via Telnyx and bridge to internal agent
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

  /**
   * Hang up a call
   */
  async hangup(uuid: string) {
    await this.esl.hangup(uuid);
    this.logger.log(`Hung up call: ${uuid}`);
    return {
      success: true,
      message: 'Call hung up',
    };
  }

  /**
   * Transfer a call to another extension
   */
  async transfer(uuid: string, destination: string) {
    await this.esl.transfer(uuid, destination);
    this.logger.log(`Transferred call ${uuid} to ${destination}`);
    return {
      success: true,
      message: `Call transferred to ${destination}`,
    };
  }

  /**
   * Get call status
   */
  async status(uuid: string) {
    const exists = await this.esl.exists(uuid);
    return { callUuid: uuid, exists };
  }

  /**
   * Get all active calls
   */
  async getActiveCalls() {
    const calls = await this.esl.getActiveCalls();
    return {
      success: true,
      data: calls,
    };
  }

  /**
   * Get all registered extensions
   */
  async getRegistrations() {
    const registrations = await this.esl.getRegistrations();
    return {
      success: true,
      data: registrations,
    };
  }

  /**
   * Get gateway status
   */
  async getGatewayStatus() {
    const status = await this.esl.getGatewayStatus();
    return {
      success: true,
      data: status,
    };
  }

  /**
   * Send DTMF tones to a call
   */
  async sendDtmf(uuid: string, digits: string) {
    await this.esl.sendDtmf(uuid, digits);
    return {
      success: true,
      message: `Sent DTMF: ${digits}`,
    };
  }

  /**
   * Hold/unhold a call
   */
  async hold(uuid: string, hold = true) {
    await this.esl.hold(uuid, hold);
    return {
      success: true,
      message: hold ? 'Call placed on hold' : 'Call resumed',
    };
  }

  /**
   * Start recording a call
   */
  async startRecording(uuid: string, filePath?: string) {
    const path = filePath || `/var/lib/freeswitch/recordings/${uuid}.wav`;
    await this.esl.startRecording(uuid, path);
    return {
      success: true,
      message: 'Recording started',
      recordingPath: path,
    };
  }

  /**
   * Stop recording a call
   */
  async stopRecording(uuid: string) {
    await this.esl.stopRecording(uuid);
    return {
      success: true,
      message: 'Recording stopped',
    };
  }
}
