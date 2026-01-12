import { Configuration, Value } from '@itgorillaz/configify';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

@Configuration()
export class FreeswitchConfig {
  @IsNotEmpty()
  @IsString()
  @Value('FS_HOST', { default: '157.173.117.207' })
  host: string;

  @IsNotEmpty()
  @IsNumber()
  @Value('FS_ESL_PORT', { parse: Number.parseInt, default: '18443' })
  eslPort: number;

  @IsNotEmpty()
  @IsString()
  @Value('FS_ESL_PASSWORD', { default: '' })
  eslPassword: string;

  @IsNotEmpty()
  @IsString()
  @Value('TELNYX_GATEWAY', { default: 'telnyx' })
  telnyxGateway: string;

  @IsNotEmpty()
  @IsString()
  @Value('TELNYX_CALLER_ID', { default: '+19495431333' })
  telnyxCallerId: string;
}
