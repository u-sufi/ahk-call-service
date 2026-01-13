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

@Injectable()
export class EslService implements OnModuleInit, OnModuleDestroy {
  private conn?: EslConnection;
  private connected = false;
  private reconnectTimer?: NodeJS.Timeout;

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
}
