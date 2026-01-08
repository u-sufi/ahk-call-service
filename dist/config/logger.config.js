"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerConfig = void 0;
const configify_1 = require("@itgorillaz/configify");
const class_validator_1 = require("class-validator");
let LoggerConfig = class LoggerConfig {
    logLevel;
    logTimestamp;
    logColorize;
};
exports.LoggerConfig = LoggerConfig;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['error', 'warn', 'info', 'debug', 'verbose']),
    (0, configify_1.Value)('LOG_LEVEL', { default: 'info' }),
    __metadata("design:type", String)
], LoggerConfig.prototype, "logLevel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, configify_1.Value)('LOG_TIMESTAMP', { parse: (val) => val === 'true', default: 'true' }),
    __metadata("design:type", Boolean)
], LoggerConfig.prototype, "logTimestamp", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, configify_1.Value)('LOG_COLORIZE', { parse: (val) => val === 'true', default: 'true' }),
    __metadata("design:type", Boolean)
], LoggerConfig.prototype, "logColorize", void 0);
exports.LoggerConfig = LoggerConfig = __decorate([
    (0, configify_1.Configuration)()
], LoggerConfig);
//# sourceMappingURL=logger.config.js.map