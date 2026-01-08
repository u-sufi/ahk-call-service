import { Configuration, Value } from '@itgorillaz/configify';
import { IsNotEmpty, IsNumber, IsString, IsBoolean } from 'class-validator';

@Configuration()
export class DatabaseConfig {
  @IsNotEmpty()
  @IsString()
  @Value('DB_HOST', { default: 'localhost' })
  host: string;

  @IsNotEmpty()
  @IsNumber()
  @Value('DB_PORT', { parse: Number.parseInt, default: '5432' })
  port: number;

  @IsNotEmpty()
  @IsString()
  @Value('DB_USERNAME', { default: 'postgres' })
  username: string;

  @IsNotEmpty()
  @IsString()
  @Value('DB_PASSWORD', { default: 'postgres' })
  password: string;

  @IsNotEmpty()
  @IsString()
  @Value('DB_NAME', { default: 'comms_engine' })
  database: string;

  @IsBoolean()
  @Value('DB_SYNCHRONIZE', { parse: (v) => v === 'true', default: 'false' })
  synchronize: boolean;

  @IsBoolean()
  @Value('DB_LOGGING', { parse: (v) => v === 'true', default: 'false' })
  logging: boolean;
}
