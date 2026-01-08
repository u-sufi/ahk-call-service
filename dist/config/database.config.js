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
exports.DatabaseConfig = void 0;
const configify_1 = require("@itgorillaz/configify");
const class_validator_1 = require("class-validator");
let DatabaseConfig = class DatabaseConfig {
    host;
    port;
    username;
    password;
    database;
    synchronize;
    logging;
};
exports.DatabaseConfig = DatabaseConfig;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('DB_HOST', { default: 'localhost' }),
    __metadata("design:type", String)
], DatabaseConfig.prototype, "host", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumber)(),
    (0, configify_1.Value)('DB_PORT', { parse: Number.parseInt, default: '5432' }),
    __metadata("design:type", Number)
], DatabaseConfig.prototype, "port", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('DB_USERNAME', { default: 'postgres' }),
    __metadata("design:type", String)
], DatabaseConfig.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('DB_PASSWORD', { default: 'postgres' }),
    __metadata("design:type", String)
], DatabaseConfig.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('DB_NAME', { default: 'comms_engine' }),
    __metadata("design:type", String)
], DatabaseConfig.prototype, "database", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, configify_1.Value)('DB_SYNCHRONIZE', { parse: (v) => v === 'true', default: 'false' }),
    __metadata("design:type", Boolean)
], DatabaseConfig.prototype, "synchronize", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, configify_1.Value)('DB_LOGGING', { parse: (v) => v === 'true', default: 'false' }),
    __metadata("design:type", Boolean)
], DatabaseConfig.prototype, "logging", void 0);
exports.DatabaseConfig = DatabaseConfig = __decorate([
    (0, configify_1.Configuration)()
], DatabaseConfig);
//# sourceMappingURL=database.config.js.map