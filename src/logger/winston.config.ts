import * as winston from 'winston';

// Custom color scheme for log levels (uppercase keys for matching)
const customColors: winston.config.AbstractConfigSetColors = {
  error: 'red bold',
  warn: 'yellow bold',
  info: 'green bold',
  debug: 'blue bold',
  verbose: 'cyan bold',
};

// Add custom colors to winston
winston.addColors(customColors);

// ANSI color codes for manual coloring
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// Map log levels to colors
const levelColors: Record<string, string> = {
  error: colors.red,
  warn: colors.yellow,
  info: colors.green,
  debug: colors.blue,
  verbose: colors.cyan,
};

/**
 * Creates a custom log format with colorization and structured output
 */
const createLogFormat = (colorize: boolean, timestamp: boolean) => {
  const formatters: winston.Logform.Format[] = [];

  if (timestamp) {
    formatters.push(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    );
  }

  formatters.push(
    winston.format.printf(({ level, message, timestamp, context, trace }) => {
      const contextStr = context ? `[${context}]` : '[Application]';
      const traceStr = trace ? `\n${trace}` : '';

      if (colorize) {
        const levelColor = levelColors[level] || colors.reset;
        const coloredLevel = `${levelColor}${colors.bold}${level.toUpperCase().padEnd(7)}${colors.reset}`;
        const coloredContext = `${colors.yellow}${contextStr}${colors.reset}`;
        const coloredTimestamp = timestamp
          ? `${colors.gray}${timestamp}${colors.reset} `
          : '';

        return `${coloredTimestamp}${coloredContext} ${coloredLevel} ${message}${traceStr}`;
      }

      const timestampStr = timestamp ? `${timestamp} ` : '';
      return `${timestampStr}${contextStr} ${level.toUpperCase().padEnd(7)} ${message}${traceStr}`;
    }),
  );

  return winston.format.combine(...formatters);
};

export interface WinstonConfigOptions {
  level: string;
  colorize: boolean;
  timestamp: boolean;
}

/**
 * Creates Winston logger options for NestJS integration
 */
export const createWinstonConfig = (
  options: WinstonConfigOptions,
): winston.LoggerOptions => {
  return {
    level: options.level,
    format: createLogFormat(options.colorize, options.timestamp),
    transports: [
      new winston.transports.Console({
        stderrLevels: ['error'],
      }),
    ],
  };
};

