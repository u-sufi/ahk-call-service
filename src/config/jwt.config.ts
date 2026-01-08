import { Configuration, Value } from '@itgorillaz/configify';
import { IsNotEmpty, IsString } from 'class-validator';

@Configuration()
export class JwtConfig {
  @IsNotEmpty()
  @IsString()
  @Value('JWT_SECRET', { default: 'dev-jwt-secret-change-in-production' })
  secret: string;

  @IsNotEmpty()
  @IsString()
  @Value('JWT_EXPIRES_IN', { default: '1d' })
  expiresIn: string;

  @IsString()
  @Value('JWT_REFRESH_SECRET', {
    default: 'dev-refresh-secret-change-in-production',
  })
  refreshSecret: string;

  @IsString()
  @Value('JWT_REFRESH_EXPIRES_IN', { default: '7d' })
  refreshExpiresIn: string;
}
