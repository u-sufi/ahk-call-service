import { Configuration, Value } from '@itgorillaz/configify';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

@Configuration()
export class RedisConfig {
  @IsNotEmpty()
  @IsString()
  @Value('REDIS_HOST', { default: 'localhost' })
  host: string;

  @IsNotEmpty()
  @IsNumber()
  @Value('REDIS_PORT', { parse: Number.parseInt, default: '6379' })
  port: number;

  @IsString()
  @Value('REDIS_PASSWORD', { default: '' })
  password: string;

  @IsNumber()
  @Value('REDIS_DB', { parse: Number.parseInt, default: '0' })
  db: number;
}
