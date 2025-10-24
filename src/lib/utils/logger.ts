/**
 * Centralized Logging Utility
 * 
 * Provides consistent logging across the application with proper levels
 * and environment-based filtering.
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

class Logger {
  private level: LogLevel;

  constructor() {
    // Set log level based on environment
    if (process.env.NODE_ENV === 'production') {
      this.level = LogLevel.WARN;
    } else if (process.env.NODE_ENV === 'development') {
      this.level = LogLevel.DEBUG;
    } else {
      this.level = LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  private formatMessage(level: string, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('INFO', message), ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message), ...args);
    }
  }

  // Specialized loggers for different components
  shopify(message: string, ...args: unknown[]): void {
    this.debug(`[Shopify] ${message}`, ...args);
  }

  vapi(message: string, ...args: unknown[]): void {
    this.debug(`[Vapi] ${message}`, ...args);
  }

  auth(message: string, ...args: unknown[]): void {
    this.debug(`[Auth] ${message}`, ...args);
  }

  db(message: string, ...args: unknown[]): void {
    this.debug(`[DB] ${message}`, ...args);
  }
}

// Export singleton instance
export const logger = new Logger();
