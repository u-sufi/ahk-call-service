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

  // CORS (dev): allow frontend to call API from another localhost port
  // Example frontend origin: http://localhost:3465
  app.enableCors({
    origin: (origin, callback) => {
      // allow non-browser tools (curl/postman) with no Origin
      if (!origin) return callback(null, true);

      // allow any localhost origin during development
      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('https://localhost:') ||
        origin.startsWith('https://127.0.0.1:')
      ) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix(appConfig.apiPrefix);

  // Always bind to configured port (default 3065). Fail fast if it's already in use.
  await app.listen(appConfig.port);

  logger.log(
    `🚀 ${appConfig.appName} is running on port ${appConfig.port}`,
    'Bootstrap',
  );
  logger.log(`📍 Environment: ${appConfig.nodeEnv}`, 'Bootstrap');
}

bootstrap();
