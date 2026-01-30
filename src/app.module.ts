import { Module } from '@nestjs/common';
import { ConfigifyModule } from '@itgorillaz/configify';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './core/redis/redis.module';
import { PrismaModule } from './core/prisma';
import { LoggerModule } from './logger';
import { CallModule } from './call/call.module';
import { AgentsModule } from './agents/agents.module';
import { InboundRoutesModule } from './inbound-routes/inbound-routes.module';
import { CdrModule } from './cdr/cdr.module';

@Module({
  imports: [
    ConfigifyModule.forRootAsync({
      // Loads .env file from root directory
    }),
    LoggerModule,
    RedisModule,
    PrismaModule,
    CallModule,
    AgentsModule,
    InboundRoutesModule,
    CdrModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
