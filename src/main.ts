import { NestFactory } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { AppConfig } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Buffer logs during startup, then use Winston
    bufferLogs: true,
  });

  // Get the Winston logger and set it as the application logger
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  const appConfig = app.get(AppConfig);

  app.setGlobalPrefix(appConfig.apiPrefix);

  await app.listen(appConfig.port);

  logger.log(
    `🚀 ${appConfig.appName} is running on port ${appConfig.port}`,
    'Bootstrap',
  );
  logger.log(`📍 Environment: ${appConfig.nodeEnv}`, 'Bootstrap');
}

bootstrap();
