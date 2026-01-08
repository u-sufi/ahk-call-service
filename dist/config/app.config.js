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
exports.AppConfig = void 0;
const configify_1 = require("@itgorillaz/configify");
const class_validator_1 = require("class-validator");
let AppConfig = class AppConfig {
    nodeEnv;
    port;
    appName;
    apiPrefix;
    get isDevelopment() {
        return this.nodeEnv === 'development';
    }
    get isProduction() {
        return this.nodeEnv === 'production';
    }
};
exports.AppConfig = AppConfig;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('NODE_ENV', { default: 'development' }),
    __metadata("design:type", String)
], AppConfig.prototype, "nodeEnv", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumber)(),
    (0, configify_1.Value)('PORT', { parse: Number.parseInt, default: '3000' }),
    __metadata("design:type", Number)
], AppConfig.prototype, "port", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('APP_NAME', { default: 'CommsEngine' }),
    __metadata("design:type", String)
], AppConfig.prototype, "appName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('API_PREFIX', { default: 'api' }),
    __metadata("design:type", String)
], AppConfig.prototype, "apiPrefix", void 0);
exports.AppConfig = AppConfig = __decorate([
    (0, configify_1.Configuration)()
], AppConfig);
//# sourceMappingURL=app.config.js.map