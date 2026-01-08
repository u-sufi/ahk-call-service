import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisConfig } from 'src/config';
import { LoggerService } from 'src/logger';

/**
 * Redis service for caching and data storage.
 * Extends ioredis client with NestJS lifecycle hooks for proper
 * connection management and graceful shutdown.
 */
@Injectable()
export class RedisService
  extends Redis
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    private readonly redisConfig: RedisConfig,
    private readonly loggerService: LoggerService,
  ) {
    super({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password || undefined,
      db: redisConfig.db,
      retryStrategy: (times: number) => {
        // Exponential backoff with max delay of 2 seconds
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
    this.loggerService.setContext(RedisService.name);
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ping();
      this.loggerService.log(
        `Successfully connected to Redis at ${this.redisConfig.host}:${this.redisConfig.port}`,
      );
    } catch (error) {
      this.loggerService.error(
        `Failed to connect to Redis: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.loggerService.log('Disconnecting from Redis');
    await this.quit();
  }
}
