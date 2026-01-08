"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerModule = void 0;
const common_1 = require("@nestjs/common");
const nest_winston_1 = require("nest-winston");
const config_1 = require("../config");
const logger_service_1 = require("./logger.service");
const winston_config_1 = require("./winston.config");
let LoggerModule = class LoggerModule {
};
exports.LoggerModule = LoggerModule;
exports.LoggerModule = LoggerModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            nest_winston_1.WinstonModule.forRootAsync({
                inject: [config_1.LoggerConfig],
                useFactory: (loggerConfig) => {
                    return (0, winston_config_1.createWinstonConfig)({
                        level: loggerConfig.logLevel,
                        colorize: loggerConfig.logColorize,
                        timestamp: loggerConfig.logTimestamp,
                    });
                },
            }),
        ],
        providers: [logger_service_1.LoggerService],
        exports: [logger_service_1.LoggerService, nest_winston_1.WinstonModule],
    })
], LoggerModule);
//# sourceMappingURL=logger.module.js.map