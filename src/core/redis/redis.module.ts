import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Global Redis Module that provides Redis connectivity throughout the application.
 * This module is marked as @Global() so RedisService can be injected anywhere
 * without explicitly importing RedisModule.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
