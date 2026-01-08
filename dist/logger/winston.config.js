"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWinstonConfig = void 0;
const winston = __importStar(require("winston"));
const customColors = {
    error: 'red bold',
    warn: 'yellow bold',
    info: 'green bold',
    debug: 'blue bold',
    verbose: 'cyan bold',
};
winston.addColors(customColors);
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
const levelColors = {
    error: colors.red,
    warn: colors.yellow,
    info: colors.green,
    debug: colors.blue,
    verbose: colors.cyan,
};
const createLogFormat = (colorize, timestamp) => {
    const formatters = [];
    if (timestamp) {
        formatters.push(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }));
    }
    formatters.push(winston.format.printf(({ level, message, timestamp, context, trace }) => {
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
    }));
    return winston.format.combine(...formatters);
};
const createWinstonConfig = (options) => {
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
exports.createWinstonConfig = createWinstonConfig;
//# sourceMappingURL=winston.config.js.map