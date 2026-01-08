import * as winston from 'winston';
export interface WinstonConfigOptions {
    level: string;
    colorize: boolean;
    timestamp: boolean;
}
export declare const createWinstonConfig: (options: WinstonConfigOptions) => winston.LoggerOptions;
