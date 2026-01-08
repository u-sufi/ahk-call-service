import { Configuration, Value } from '@itgorillaz/configify';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

@Configuration()
export class LoggerConfig {
  @IsOptional()
  @IsIn(['error', 'warn', 'info', 'debug', 'verbose'])
  @Value('LOG_LEVEL', { default: 'info' })
  logLevel: LogLevel;

  @IsOptional()
  @IsBoolean()
  @Value('LOG_TIMESTAMP', { parse: (val) => val === 'true', default: 'true' })
  logTimestamp: boolean;

  @IsOptional()
  @IsBoolean()
  @Value('LOG_COLORIZE', { parse: (val) => val === 'true', default: 'true' })
  logColorize: boolean;
}
