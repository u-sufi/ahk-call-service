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
exports.RedisConfig = void 0;
const configify_1 = require("@itgorillaz/configify");
const class_validator_1 = require("class-validator");
let RedisConfig = class RedisConfig {
    host;
    port;
    password;
    db;
};
exports.RedisConfig = RedisConfig;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('REDIS_HOST', { default: 'localhost' }),
    __metadata("design:type", String)
], RedisConfig.prototype, "host", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumber)(),
    (0, configify_1.Value)('REDIS_PORT', { parse: Number.parseInt, default: '6379' }),
    __metadata("design:type", Number)
], RedisConfig.prototype, "port", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('REDIS_PASSWORD', { default: '' }),
    __metadata("design:type", String)
], RedisConfig.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, configify_1.Value)('REDIS_DB', { parse: Number.parseInt, default: '0' }),
    __metadata("design:type", Number)
], RedisConfig.prototype, "db", void 0);
exports.RedisConfig = RedisConfig = __decorate([
    (0, configify_1.Configuration)()
], RedisConfig);
//# sourceMappingURL=redis.config.js.map