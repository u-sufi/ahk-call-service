import { Configuration, Value } from '@itgorillaz/configify';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

export enum StorageProvider {
  S3 = 's3',
  AZURE = 'azure',
  LOCAL = 'local',
}

@Configuration()
export class StorageConfig {
  @IsNotEmpty()
  @IsEnum(StorageProvider)
  @Value('STORAGE_PROVIDER', { default: 'local' })
  provider: StorageProvider;

  // S3 Configuration
  @IsString()
  @Value('S3_BUCKET', { default: '' })
  s3Bucket: string;

  @IsString()
  @Value('S3_REGION', { default: '' })
  s3Region: string;

  @IsString()
  @Value('S3_ACCESS_KEY', { default: '' })
  s3AccessKey: string;

  @IsString()
  @Value('S3_SECRET_KEY', { default: '' })
  s3SecretKey: string;

  // Azure Configuration
  @IsString()
  @Value('AZURE_STORAGE_CONNECTION_STRING', { default: '' })
  azureConnectionString: string;

  @IsString()
  @Value('AZURE_STORAGE_CONTAINER', { default: '' })
  azureContainer: string;

  // Local Configuration
  @IsString()
  @Value('LOCAL_STORAGE_PATH', { default: './uploads' })
  localStoragePath: string;
}
