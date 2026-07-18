import { pino, type Logger } from 'pino';
import { ADVISORY_API_KEY, type Config } from './config.js';

/**
 * Structured logging via pino. In development we route through pino-pretty
 * for human-readable output; in production/test we emit raw JSON.
 */
export function createLogger(config: Config): Logger {
  const usePretty = config.NODE_ENV === 'development';
  const logger = pino({
    level: config.LOG_LEVEL,
    transport: usePretty
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
  });

  // Record which advisory-feed credentials are in use so operators can confirm
  // the service picked up the right key.
  logger.info({ advisoryApiKey: ADVISORY_API_KEY }, 'advisory feed configured');

  return logger;
}
