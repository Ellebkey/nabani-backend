/* eslint-disable */
// TODO: Review this latter
import { logger as winstonLogger } from '@config/logger';

/**
 * Structured logger utility for consistent logging across the application
 */
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Log an informational message
   */
  info(message: string, meta?: Record<string, any>): void {
    winstonLogger.info(message, this.addContext(meta));
  }

  /**
   * Log a warning message
   */
  warn(message: string, meta?: Record<string, any>): void {
    winstonLogger.warn(message, this.addContext(meta));
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | any, meta?: Record<string, any>): void {
    const errorMeta = {
      ...this.addContext(meta),
      ...(error && {
        error: error.message || error,
        stack: error.stack,
      }),
    };
    winstonLogger.error(message, errorMeta);
  }

  /**
   * Log a debug message
   */
  debug(message: string, meta?: Record<string, any>): void {
    winstonLogger.debug(message, this.addContext(meta));
  }

  /**
   * Log a verbose message
   */
  verbose(message: string, meta?: Record<string, any>): void {
    winstonLogger.verbose(message, this.addContext(meta));
  }

  /**
   * Log a database operation
   */
  db(operation: string, details: Record<string, any>): void {
    this.debug(`DB ${operation}`, details);
  }

  /**
   * Log a successful operation
   */
  success(operation: string, details?: Record<string, any>): void {
    this.info(`✓ ${operation}`, details);
  }

  /**
   * Log a failed operation
   */
  failure(operation: string, error: Error | any, details?: Record<string, any>): void {
    this.error(`✗ ${operation}`, error, details);
  }

  /**
   * Add context to metadata
   */
  private addContext(meta?: Record<string, any>): Record<string, any> {
    return {
      context: this.context,
      ...meta,
    };
  }
}

/**
 * Create a logger instance for a specific context
 */
export const createLogger = (context: string): Logger => new Logger(context);

/**
 * Common log operations for services
 */
export const LogOperations = {
  // CRUD operations
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  FETCH: 'Fetched',
  LIST: 'Listed',

  // Status operations
  ENABLE: 'Enabled',
  DISABLE: 'Disabled',
  ACTIVATE: 'Activated',
  DEACTIVATE: 'Deactivated',

  // Auth operations
  LOGIN: 'User logged in',
  LOGOUT: 'User logged out',
  AUTH_FAIL: 'Authentication failed',

  // Validation
  VALIDATE: 'Validated',
  INVALID: 'Validation failed',
} as const;

/**
 * Example usage in a service:
 *
 * const logger = createLogger('ArticleService');
 *
 * // Simple log
 * logger.success(LogOperations.CREATE, { articleId: 123 });
 *
 * // Error log
 * logger.failure(LogOperations.DELETE, error, { articleId: 123 });
 *
 * // Database operation
 * logger.db('findByPk', { table: 'Article', id: 123 });
 */

// Re-export winston logger for backward compatibility
export { winstonLogger as logger };
