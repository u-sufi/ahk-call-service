import {
  Inject,
  Injectable,
  LoggerService as NestLoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

/**
 * Custom Logger Service that wraps Winston logger for NestJS integration.
 * Implements NestJS LoggerService interface for seamless framework integration.
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private context?: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  /**
   * Set the context (typically the class name) for all subsequent log calls
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Log an info-level message
   */
  log(message: string, context?: string): void {
    this.logger.info(message, { context: context || this.context });
  }

  /**
   * Log an error-level message with optional stack trace
   */
  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, {
      context: context || this.context,
      trace,
    });
  }

  /**
   * Log a warning-level message
   */
  warn(message: string, context?: string): void {
    this.logger.warn(message, { context: context || this.context });
  }

  /**
   * Log a debug-level message
   */
  debug(message: string, context?: string): void {
    this.logger.debug(message, { context: context || this.context });
  }

  /**
   * Log a verbose-level message
   */
  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context: context || this.context });
  }

  /**
   * Create a child logger with a specific context
   */
  createChildLogger(context: string): LoggerService {
    const childLogger = new LoggerService(this.logger);
    childLogger.setContext(context);
    return childLogger;
  }
}
