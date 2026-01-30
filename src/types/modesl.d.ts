declare module 'modesl' {
  export interface EslEvent {
    getHeader(name: string): string | undefined;
    getBody(): string;
  }

  export interface EslResponse {
    getBody(): string;
  }

  export class Connection {
    constructor(
      host: string,
      port: number,
      password: string,
      onConnect?: () => void,
    );

    disconnect(): void;
    subscribe(events: string | string[], callback?: () => void): void;
    on(event: string, callback: (...args: unknown[]) => void): void;
    api(command: string, callback: (response: EslResponse) => void): void;
    bgapi(command: string, callback?: (response: EslResponse) => void): void;
    execute(
      app: string,
      arg?: string,
      uuid?: string,
      callback?: (response: EslResponse) => void,
    ): void;
    executeAsync(
      app: string,
      arg?: string,
      uuid?: string,
      callback?: (response: EslResponse) => void,
    ): void;
    filter(header: string, value: string, callback?: () => void): void;
    filterDelete(header: string, value?: string, callback?: () => void): void;
    events(
      type: string,
      events: string | string[],
      callback?: () => void,
    ): void;
    auth(callback?: (error?: Error) => void): void;
    connected(): boolean;
    getInfo(): EslEvent | null;
  }

  export class Server {
    constructor(options?: { port?: number; host?: string });
    on(event: string, callback: (...args: unknown[]) => void): void;
    close(): void;
  }
}
