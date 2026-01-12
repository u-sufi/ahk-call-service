import { Module } from '@nestjs/common';
import { ConfigifyModule } from '@itgorillaz/configify';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './core/redis/redis.module';
import { LoggerModule } from './logger';
import { CallModule } from './call/call.module';

@Module({
  imports: [
    ConfigifyModule.forRootAsync({
      // Loads .env file from root directory
    }),
    LoggerModule,
    RedisModule,
    CallModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
