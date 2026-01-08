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
exports.JwtConfig = void 0;
const configify_1 = require("@itgorillaz/configify");
const class_validator_1 = require("class-validator");
let JwtConfig = class JwtConfig {
    secret;
    expiresIn;
    refreshSecret;
    refreshExpiresIn;
};
exports.JwtConfig = JwtConfig;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('JWT_SECRET', { default: 'dev-jwt-secret-change-in-production' }),
    __metadata("design:type", String)
], JwtConfig.prototype, "secret", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('JWT_EXPIRES_IN', { default: '1d' }),
    __metadata("design:type", String)
], JwtConfig.prototype, "expiresIn", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('JWT_REFRESH_SECRET', {
        default: 'dev-refresh-secret-change-in-production',
    }),
    __metadata("design:type", String)
], JwtConfig.prototype, "refreshSecret", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('JWT_REFRESH_EXPIRES_IN', { default: '7d' }),
    __metadata("design:type", String)
], JwtConfig.prototype, "refreshExpiresIn", void 0);
exports.JwtConfig = JwtConfig = __decorate([
    (0, configify_1.Configuration)()
], JwtConfig);
//# sourceMappingURL=jwt.config.js.map