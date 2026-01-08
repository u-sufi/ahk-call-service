import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { LoggerConfig } from '../config';
import { LoggerService } from './logger.service';
import { createWinstonConfig } from './winston.config';

/**
 * Global Logger Module that provides Winston-based logging throughout the application.
 * This module is marked as @Global() so LoggerService can be injected anywhere without
 * explicitly importing LoggerModule.
 */
@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      inject: [LoggerConfig],
      useFactory: (loggerConfig: LoggerConfig) => {
        return createWinstonConfig({
          level: loggerConfig.logLevel,
          colorize: loggerConfig.logColorize,
          timestamp: loggerConfig.logTimestamp,
        });
      },
    }),
  ],
  providers: [LoggerService],
  exports: [LoggerService, WinstonModule],
})
export class LoggerModule {}

