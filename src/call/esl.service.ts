import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Connection } from 'modesl';
import { FreeswitchConfig } from '../config/freeswitch.config';
import { LoggerService } from '../logger';

type EslEvent = {
  getHeader(name: string): string | undefined;
};

type EslResponse = {
  getBody(): string;
};

type EslConnection = {
  disconnect(): void;
  subscribe(arg: string | string[], cb?: () => void): void;
  on(event: string, cb: (...args: unknown[]) => void): void;
  api(command: string, cb: (res: EslResponse) => void): void;
};

type EslConnectionCtor = new (
  host: string,
  port: number,
  password: string,
  onConnect: () => void,
) => EslConnection;

function isEslEvent(v: unknown): v is EslEvent {
  return (
    typeof v === 'object' &&
    v !== null &&
    'getHeader' in v &&
    typeof (v as { getHeader?: unknown }).getHeader === 'function'
  );
}

function isEslResponse(v: unknown): v is EslResponse {
  return (
    typeof v === 'object' &&
    v !== null &&
    'getBody' in v &&
    typeof (v as { getBody?: unknown }).getBody === 'function'
  );
}

export interface CdrEvent {
  uuid: string;
  callerIdName?: string;
  callerIdNumber?: string;
  destinationNumber?: string;
  startTime?: string;
  answerTime?: string;
  endTime?: string;
  duration: number;
  billsec: number;
  hangupCause?: string;
  direction?: string;
}

export interface RegistrationInfo {
  registered: boolean;
  contact?: string;
  userAgent?: string;
  expires?: number;
}

export interface ActiveCall {
  uuid: string;
  direction: string;
  created: string;
  name: string;
  state: string;
  cidName: string;
  cidNum: string;
  destNum: string;
  application: string;
  applicationData: string;
}

@Injectable()
export class EslService implements OnModuleInit, OnModuleDestroy {
  private conn?: EslConnection;
  private connected = false;
  private reconnectTimer?: NodeJS.Timeout;
  private cdrCallbacks: ((cdr: CdrEvent) => void)[] = [];

  constructor(
    private readonly fsConfig: FreeswitchConfig,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(EslService.name);
  }

  onModuleInit(): void {
    // Don't block app startup on ESL connectivity
    void this.connect();
  }

  onModuleDestroy(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.conn) {
      try {
        this.conn.disconnect();
      } catch {
        // ignore
      }
    }
  }

  get isConnected(): boolean {
    return this.connected;
  }

  private scheduleReconnect(delayMs = 5000): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, delayMs);
  }

  /**
   * Register a callback for CDR events
   */
  onCallEnd(callback: (cdr: CdrEvent) => void): void {
    this.cdrCallbacks.push(callback);
  }

  async connect(): Promise<void> {
    this.logger.log(
      `Connecting to FreeSWITCH ESL ${this.fsConfig.host}:${this.fsConfig.eslPort}...`,
    );

    return new Promise((resolve) => {
      try {
        const Conn = Connection as unknown as EslConnectionCtor;
        this.conn = new Conn(
          this.fsConfig.host,
          this.fsConfig.eslPort,
          this.fsConfig.eslPassword,
          () => {
            this.connected = true;
            this.logger.log(
              `✅ ESL connected ${this.fsConfig.host}:${this.fsConfig.eslPort}`,
            );
            try {
              this.conn?.subscribe('all');
            } catch {
              // ignore
            }

            // Log key call lifecycle events for debugging / DevOps validation
            this.conn?.on('esl::event::**', (event: unknown) => {
              try {
                if (!isEslEvent(event)) return;
                const eventName = event.getHeader('Event-Name') ?? '';
                const uuid = event.getHeader('Unique-ID') ?? '';

                if (
                  eventName === 'CHANNEL_CREATE' ||
                  eventName === 'CHANNEL_PROGRESS' ||
                  eventName === 'CHANNEL_ANSWER' ||
                  eventName === 'CHANNEL_HANGUP'
                ) {
                  this.logger.log(`FS Event ${eventName} uuid=${uuid}`);
                }

                // Handle CDR events
                if (eventName === 'CHANNEL_HANGUP_COMPLETE') {
                  const cdr: CdrEvent = {
                    uuid: event.getHeader('Unique-ID') ?? '',
                    callerIdName: event.getHeader('Caller-Caller-ID-Name'),
                    callerIdNumber: event.getHeader('Caller-Caller-ID-Number'),
                    destinationNumber: event.getHeader(
                      'Caller-Destination-Number',
                    ),
                    startTime: event.getHeader('variable_start_stamp'),
                    answerTime: event.getHeader('variable_answer_stamp'),
                    endTime: event.getHeader('variable_end_stamp'),
                    duration: parseInt(
                      event.getHeader('variable_duration') || '0',
                      10,
                    ),
                    billsec: parseInt(
                      event.getHeader('variable_billsec') || '0',
                      10,
                    ),
                    hangupCause: event.getHeader('Hangup-Cause'),
                    direction: event.getHeader('Call-Direction'),
                  };

                  // Notify all registered callbacks
                  for (const callback of this.cdrCallbacks) {
                    try {
                      callback(cdr);
                    } catch (err) {
                      this.logger.error(
                        `CDR callback error: ${err instanceof Error ? err.message : String(err)}`,
                      );
                    }
                  }
                }
              } catch {
                // ignore
              }
            });
            resolve();
          },
        );

        this.conn.on('error', (err: unknown) => {
          this.connected = false;
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`ESL error: ${msg}`);
          this.scheduleReconnect();
        });

        this.conn.on('esl::end', () => {
          this.connected = false;
          this.logger.warn('ESL connection ended');
          this.scheduleReconnect();
        });
      } catch (err) {
        this.connected = false;
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`ESL connect failed: ${msg}`);
        this.scheduleReconnect();
        resolve();
      }
    });
  }

  /**
   * Send a raw API command to FreeSWITCH
   */
  async sendCommand(command: string): Promise<string> {
    if (!this.conn || !this.connected) {
      throw new Error('ESL is not connected');
    }

    return new Promise((resolve, reject) => {
      this.conn!.api(command, (res: EslResponse) => {
        const body = isEslResponse(res) ? res.getBody() : String(res);
        if (body.includes('-ERR')) {
          reject(new Error(body.trim()));
        } else {
          resolve(body.trim());
        }
      });
    });
  }

  /**
   * Reload FreeSWITCH XML configuration
   */
  async reloadXml(): Promise<string> {
    this.logger.log('Reloading FreeSWITCH XML configuration');
    return this.sendCommand('reloadxml');
  }

  /**
   * Get all registered extensions
   */
  async getRegistrations(): Promise<string> {
    return this.sendCommand('sofia status profile internal reg');
  }

  /**
   * Check if a specific extension is registered
   */
  async isExtensionOnline(extension: string): Promise<boolean> {
    try {
      const result = await this.getRegistrations();
      return result.includes(`${extension}@`);
    } catch {
      return false;
    }
  }

  /**
   * Get detailed registration info for an extension
   */
  async getExtensionRegistration(extension: string): Promise<RegistrationInfo> {
    try {
      const result = await this.getRegistrations();
      const lines = result.split('\n');

      for (const line of lines) {
        if (line.includes(`${extension}@`)) {
          // Parse the registration line
          // Format varies, but typically includes: Call-ID, User, Contact, Agent, Status, Ping
          const parts = line.split(/\s+/);
          return {
            registered: true,
            contact: parts.find((p) => p.includes('@')) || undefined,
            userAgent: parts.find((p) => p.includes('/')) || undefined,
          };
        }
      }

      return { registered: false };
    } catch {
      return { registered: false };
    }
  }

  /**
   * Get gateway status
   */
  async getGatewayStatus(gateway?: string): Promise<string> {
    const gw = gateway || this.fsConfig.telnyxGateway;
    return this.sendCommand(`sofia status gateway ${gw}`);
  }

  /**
   * Get active calls
   */
  async getActiveCalls(): Promise<ActiveCall[]> {
    try {
      const result = await this.sendCommand('show calls as json');
      const parsed = JSON.parse(result) as { rows?: ActiveCall[] };
      return parsed.rows ?? [];
    } catch {
      // Fallback to text parsing if JSON fails
      const result = await this.sendCommand('show calls');
      return this.parseShowCallsText(result);
    }
  }

  private parseShowCallsText(text: string): ActiveCall[] {
    const calls: ActiveCall[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.includes('uuid') || line.includes('---') || !line.trim())
        continue;
      const parts = line.split(',');
      if (parts.length >= 5) {
        calls.push({
          uuid: parts[0]?.trim() || '',
          direction: parts[1]?.trim() || '',
          created: parts[2]?.trim() || '',
          name: parts[3]?.trim() || '',
          state: parts[4]?.trim() || '',
          cidName: parts[5]?.trim() || '',
          cidNum: parts[6]?.trim() || '',
          destNum: parts[7]?.trim() || '',
          application: parts[8]?.trim() || '',
          applicationData: parts[9]?.trim() || '',
        });
      }
    }

    return calls;
  }

  /**
   * Initiate click-to-call: First call agent, then bridge to destination
   */
  async dialOut(
    agentExtension: string,
    destination: string,
    callerIdNumber?: string,
    callerIdName?: string,
    timeoutSeconds = 60,
  ): Promise<string> {
    if (!this.conn || !this.connected) {
      throw new Error('ESL is not connected');
    }

    const vars = [
      `origination_caller_id_number=${callerIdNumber || this.fsConfig.telnyxCallerId}`,
      `origination_caller_id_name=${callerIdName || 'Outbound Call'}`,
      `origination_timeout=${timeoutSeconds}`,
      'call_direction=outbound',
    ].join(',');

    // First call the agent, then bridge to destination via gateway
    const cmd = `originate {${vars}}user/${agentExtension}@${this.fsConfig.domain} &bridge(sofia/gateway/${this.fsConfig.telnyxGateway}/${destination})`;

    this.logger.log(`Click-to-call: ${agentExtension} -> ${destination}`);

    return new Promise((resolve, reject) => {
      this.conn!.api(cmd, (res: EslResponse) => {
        const body = isEslResponse(res) ? res.getBody() : String(res);
        const ok = body.match(/\+OK\s+([a-f0-9-]+)/i);
        if (ok?.[1]) return resolve(ok[1]);
        if (body.includes('-ERR')) return reject(new Error(body.trim()));
        return resolve(body.trim());
      });
    });
  }

  /**
   * Originate call with echo test (for testing)
   */
  async originateEcho(destinationE164: string): Promise<string> {
    if (!this.conn || !this.connected) {
      throw new Error('ESL is not connected');
    }

    const vars = [
      `origination_caller_id_number=${this.fsConfig.telnyxCallerId}`,
      'call_direction=outbound',
      'test_call=true',
    ].join(',');

    const dialString = `sofia/gateway/${this.fsConfig.telnyxGateway}/${destinationE164}`;
    const cmd = `{${vars}}${dialString} &echo()`;

    return new Promise((resolve, reject) => {
      this.conn!.api(`originate ${cmd}`, (res: EslResponse) => {
        const body = isEslResponse(res) ? res.getBody() : String(res);
        const ok = body.match(/\+OK\s+([a-f0-9-]+)/i);
        if (ok?.[1]) return resolve(ok[1]);
        if (body.includes('-ERR')) return reject(new Error(body.trim()));
        return resolve(body.trim());
      });
    });
  }

  /**
   * Originate call and park (for advanced use)
   */
  async originatePark(
    toE164: string,
    fromE164?: string,
    timeoutSeconds = 60,
  ): Promise<string> {
    if (!this.conn || !this.connected) {
      throw new Error('ESL is not connected');
    }

    const vars = [
      `origination_caller_id_number=${fromE164 || this.fsConfig.telnyxCallerId}`,
      `origination_timeout=${timeoutSeconds}`,
      'call_direction=outbound',
    ].join(',');

    const dialString = `sofia/gateway/${this.fsConfig.telnyxGateway}/${toE164}`;
    const cmd = `{${vars}}${dialString} &park()`;

    return new Promise((resolve, reject) => {
      this.conn!.api(`originate ${cmd}`, (res: EslResponse) => {
        const body = isEslResponse(res) ? res.getBody() : String(res);
        const ok = body.match(/\+OK\s+([a-f0-9-]+)/i);
        if (ok?.[1]) return resolve(ok[1]);
        if (body.includes('-ERR')) return reject(new Error(body.trim()));
        return resolve(body.trim());
      });
    });
  }

  /**
   * Originate call via gateway and bridge to internal user
   */
  async originateBridgeToUser(
    toE164: string,
    agentExtension: string,
    fromE164?: string,
    timeoutSeconds = 60,
  ): Promise<string> {
    if (!this.conn || !this.connected) {
      throw new Error('ESL is not connected');
    }

    const vars = [
      `origination_caller_id_number=${fromE164 || this.fsConfig.telnyxCallerId}`,
      `origination_timeout=${timeoutSeconds}`,
      'call_direction=outbound',
    ].join(',');

    const dialString = `sofia/gateway/${this.fsConfig.telnyxGateway}/${toE164}`;
    const app = `&bridge(user/${agentExtension}@${this.fsConfig.domain})`;
    const cmd = `{${vars}}${dialString} ${app}`;

    return new Promise((resolve, reject) => {
      this.conn!.api(`originate ${cmd}`, (res: EslResponse) => {
        const body = isEslResponse(res) ? res.getBody() : String(res);
        const ok = body.match(/\+OK\s+([a-f0-9-]+)/i);
        if (ok?.[1]) return resolve(ok[1]);
        if (body.includes('-ERR')) return reject(new Error(body.trim()));
        return resolve(body.trim());
      });
    });
  }

  /**
   * Hang up a call by UUID
   */
  async hangup(uuid: string): Promise<void> {
    if (!this.conn || !this.connected) {
      throw new Error('ESL is not connected');
    }

    await new Promise<void>((resolve, reject) => {
      this.conn!.api(`uuid_kill ${uuid}`, (res: EslResponse) => {
        const body = isEslResponse(res) ? res.getBody() : String(res);
        if (body.includes('+OK')) return resolve();
        return reject(new Error(body.trim()));
      });
    });
  }

  /**
   * Transfer a call to another extension
   */
  async transfer(uuid: string, destination: string): Promise<void> {
    if (!this.conn || !this.connected) {
      throw new Error('ESL is not connected');
    }

    await new Promise<void>((resolve, reject) => {
      this.conn!.api(
        `uuid_transfer ${uuid} ${destination}`,
        (res: EslResponse) => {
          const body = isEslResponse(res) ? res.getBody() : String(res);
          if (body.includes('+OK')) return resolve();
          return reject(new Error(body.trim()));
        },
      );
    });
  }

  /**
   * Check if a call exists
   */
  async exists(uuid: string): Promise<boolean> {
    if (!this.conn || !this.connected) {
      throw new Error('ESL is not connected');
    }

    return await new Promise<boolean>((resolve) => {
      this.conn!.api(`uuid_exists ${uuid}`, (res: EslResponse) => {
        const body = (isEslResponse(res) ? res.getBody() : String(res)).trim();
        resolve(body === 'true' || body === '+OK true');
      });
    });
  }

  /**
   * Send DTMF tones to a call
   */
  async sendDtmf(uuid: string, digits: string): Promise<void> {
    if (!this.conn || !this.connected) {
      throw new Error('ESL is not connected');
    }

    await new Promise<void>((resolve, reject) => {
      this.conn!.api(`uuid_send_dtmf ${uuid} ${digits}`, (res: EslResponse) => {
        const body = isEslResponse(res) ? res.getBody() : String(res);
        if (body.includes('+OK')) return resolve();
        return reject(new Error(body.trim()));
      });
    });
  }

  /**
   * Hold/unhold a call
   */
  async hold(uuid: string, hold = true): Promise<void> {
    if (!this.conn || !this.connected) {
      throw new Error('ESL is not connected');
    }

    const cmd = hold ? `uuid_hold ${uuid}` : `uuid_hold off ${uuid}`;

    await new Promise<void>((resolve, reject) => {
      this.conn!.api(cmd, (res: EslResponse) => {
        const body = isEslResponse(res) ? res.getBody() : String(res);
        if (body.includes('+OK')) return resolve();
        return reject(new Error(body.trim()));
      });
    });
  }

  /**
   * Start recording a call
   */
  async startRecording(uuid: string, filePath: string): Promise<void> {
    if (!this.conn || !this.connected) {
      throw new Error('ESL is not connected');
    }

    await new Promise<void>((resolve, reject) => {
      this.conn!.api(
        `uuid_record ${uuid} start ${filePath}`,
        (res: EslResponse) => {
          const body = isEslResponse(res) ? res.getBody() : String(res);
          if (body.includes('+OK')) return resolve();
          return reject(new Error(body.trim()));
        },
      );
    });
  }

  /**
   * Stop recording a call
   */
  async stopRecording(uuid: string): Promise<void> {
    if (!this.conn || !this.connected) {
      throw new Error('ESL is not connected');
    }

    await new Promise<void>((resolve, reject) => {
      this.conn!.api(`uuid_record ${uuid} stop all`, (res: EslResponse) => {
        const body = isEslResponse(res) ? res.getBody() : String(res);
        if (body.includes('+OK')) return resolve();
        return reject(new Error(body.trim()));
      });
    });
  }
}
