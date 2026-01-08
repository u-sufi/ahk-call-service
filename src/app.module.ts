import { Module } from '@nestjs/common';
import { ConfigifyModule } from '@itgorillaz/configify';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './core/redis/redis.module';
import { LoggerModule } from './logger';

@Module({
  imports: [
    ConfigifyModule.forRootAsync({
      // Loads .env file from root directory
    }),
    LoggerModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
