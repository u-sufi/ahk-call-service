"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const nest_winston_1 = require("nest-winston");
const app_module_1 = require("./app.module");
const config_1 = require("./config");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bufferLogs: true,
    });
    const logger = app.get(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER);
    app.useLogger(logger);
    const appConfig = app.get(config_1.AppConfig);
    app.setGlobalPrefix(appConfig.apiPrefix);
    await app.listen(appConfig.port);
    logger.log(`🚀 ${appConfig.appName} is running on port ${appConfig.port}`, 'Bootstrap');
    logger.log(`📍 Environment: ${appConfig.nodeEnv}`, 'Bootstrap');
}
bootstrap();
//# sourceMappingURL=main.js.map