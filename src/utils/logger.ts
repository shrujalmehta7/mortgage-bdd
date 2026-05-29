import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';
import * as path from 'path';
import * as fs from 'fs';

const logsDir = 'reports/logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export class Logger {
  private logger: WinstonLogger;
  private context: string;

  constructor(context: string) {
    this.context = context;
    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.printf(({ timestamp, level, message, stack }) => {
          const base = `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
          return stack ? `${base}\n${stack}` : base;
        })
      ),
      transports: [
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.printf(({ timestamp, level, message }) =>
              `[${timestamp}] [${level}] [${context}] ${message}`
            )
          ),
        }),
        new transports.File({
          filename: path.join(logsDir, 'test-run.log'),
          format: format.combine(format.timestamp(), format.json()),
        }),
        new transports.File({
          filename: path.join(logsDir, 'errors.log'),
          level: 'error',
        }),
      ],
    });
  }

  info(message: string, meta?: object): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: object): void {
    this.logger.warn(message, meta);
  }

  error(message: string, error?: unknown): void {
    if (error instanceof Error) {
      this.logger.error(message, { stack: error.stack });
    } else {
      this.logger.error(message, { detail: error });
    }
  }

  debug(message: string, meta?: object): void {
    this.logger.debug(message, meta);
  }

  step(stepName: string): void {
    this.logger.info(`▶ STEP: ${stepName}`);
  }
}
