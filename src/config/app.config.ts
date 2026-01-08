import { Configuration, Value } from '@itgorillaz/configify';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

@Configuration()
export class AppConfig {
  @IsNotEmpty()
  @IsString()
  @Value('NODE_ENV', { default: 'development' })
  nodeEnv: string;

  @IsNotEmpty()
  @IsNumber()
  @Value('PORT', { parse: Number.parseInt, default: '3000' })
  port: number;

  @IsNotEmpty()
  @IsString()
  @Value('APP_NAME', { default: 'CommsEngine' })
  appName: string;

  @IsString()
  @Value('API_PREFIX', { default: 'api' })
  apiPrefix: string;

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
}
