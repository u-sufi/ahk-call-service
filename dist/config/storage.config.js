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
exports.StorageConfig = exports.StorageProvider = void 0;
const configify_1 = require("@itgorillaz/configify");
const class_validator_1 = require("class-validator");
var StorageProvider;
(function (StorageProvider) {
    StorageProvider["S3"] = "s3";
    StorageProvider["AZURE"] = "azure";
    StorageProvider["LOCAL"] = "local";
})(StorageProvider || (exports.StorageProvider = StorageProvider = {}));
let StorageConfig = class StorageConfig {
    provider;
    s3Bucket;
    s3Region;
    s3AccessKey;
    s3SecretKey;
    azureConnectionString;
    azureContainer;
    localStoragePath;
};
exports.StorageConfig = StorageConfig;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(StorageProvider),
    (0, configify_1.Value)('STORAGE_PROVIDER', { default: 'local' }),
    __metadata("design:type", String)
], StorageConfig.prototype, "provider", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('S3_BUCKET', { default: '' }),
    __metadata("design:type", String)
], StorageConfig.prototype, "s3Bucket", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('S3_REGION', { default: '' }),
    __metadata("design:type", String)
], StorageConfig.prototype, "s3Region", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('S3_ACCESS_KEY', { default: '' }),
    __metadata("design:type", String)
], StorageConfig.prototype, "s3AccessKey", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('S3_SECRET_KEY', { default: '' }),
    __metadata("design:type", String)
], StorageConfig.prototype, "s3SecretKey", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('AZURE_STORAGE_CONNECTION_STRING', { default: '' }),
    __metadata("design:type", String)
], StorageConfig.prototype, "azureConnectionString", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('AZURE_STORAGE_CONTAINER', { default: '' }),
    __metadata("design:type", String)
], StorageConfig.prototype, "azureContainer", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, configify_1.Value)('LOCAL_STORAGE_PATH', { default: './uploads' }),
    __metadata("design:type", String)
], StorageConfig.prototype, "localStoragePath", void 0);
exports.StorageConfig = StorageConfig = __decorate([
    (0, configify_1.Configuration)()
], StorageConfig);
//# sourceMappingURL=storage.config.js.map