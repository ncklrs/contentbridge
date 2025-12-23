/**
 * Simple logger utility for ContentBridge
 *
 * Provides structured logging with levels and context.
 * Can be extended or replaced with more sophisticated logging libraries.
 */

/**
 * Log levels in order of severity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Log level numeric values for comparison
 */
const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * Logger configuration options
 */
export interface LoggerOptions {
  /**
   * Minimum log level to output
   * @default 'info'
   */
  level?: LogLevel

  /**
   * Prefix for all log messages
   * @example '[ContentBridge]'
   */
  prefix?: string

  /**
   * Whether to include timestamps
   * @default true
   */
  timestamp?: boolean

  /**
   * Custom output function (for testing or custom transports)
   * @default console
   */
  output?: {
    debug: (...args: unknown[]) => void
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
    error: (...args: unknown[]) => void
  }

  /**
   * Additional metadata to include in all logs
   */
  metadata?: Record<string, unknown>
}

/**
 * Logger instance
 */
export class Logger {
  private readonly level: LogLevel
  private readonly prefix?: string
  private readonly timestamp: boolean
  private readonly output: Required<LoggerOptions>['output']
  private readonly metadata?: Record<string, unknown>

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? 'info'
    this.prefix = options.prefix
    this.timestamp = options.timestamp ?? true
    this.output = options.output ?? console
    this.metadata = options.metadata
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[this.level]
  }

  /**
   * Format log message with prefix and timestamp
   */
  private formatMessage(level: LogLevel, message: string): string {
    const parts: string[] = []

    if (this.timestamp) {
      parts.push(`[${new Date().toISOString()}]`)
    }

    if (this.prefix) {
      parts.push(this.prefix)
    }

    parts.push(`[${level.toUpperCase()}]`)
    parts.push(message)

    return parts.join(' ')
  }

  /**
   * Merge context with global metadata
   */
  private mergeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!this.metadata && !context) {
      return undefined
    }
    return { ...this.metadata, ...context }
  }

  /**
   * Debug level logging (verbose)
   * @param message - Log message
   * @param context - Optional context object
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return

    const formattedMessage = this.formatMessage('debug', message)
    const mergedContext = this.mergeContext(context)

    if (mergedContext) {
      this.output.debug(formattedMessage, mergedContext)
    } else {
      this.output.debug(formattedMessage)
    }
  }

  /**
   * Info level logging (general information)
   * @param message - Log message
   * @param context - Optional context object
   */
  info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return

    const formattedMessage = this.formatMessage('info', message)
    const mergedContext = this.mergeContext(context)

    if (mergedContext) {
      this.output.info(formattedMessage, mergedContext)
    } else {
      this.output.info(formattedMessage)
    }
  }

  /**
   * Warn level logging (warnings)
   * @param message - Log message
   * @param context - Optional context object
   */
  warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return

    const formattedMessage = this.formatMessage('warn', message)
    const mergedContext = this.mergeContext(context)

    if (mergedContext) {
      this.output.warn(formattedMessage, mergedContext)
    } else {
      this.output.warn(formattedMessage)
    }
  }

  /**
   * Error level logging (errors)
   * @param message - Log message
   * @param error - Optional error object
   * @param context - Optional context object
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) return

    const formattedMessage = this.formatMessage('error', message)
    const mergedContext = this.mergeContext(context)

    if (error || mergedContext) {
      this.output.error(formattedMessage, {
        error: error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : undefined,
        ...mergedContext,
      })
    } else {
      this.output.error(formattedMessage)
    }
  }

  /**
   * Create a child logger with additional context
   * @param prefix - Additional prefix for child logger
   * @param metadata - Additional metadata for child logger
   */
  child(prefix?: string, metadata?: Record<string, unknown>): Logger {
    return new Logger({
      level: this.level,
      prefix: prefix ? `${this.prefix ?? ''}${prefix}` : this.prefix,
      timestamp: this.timestamp,
      output: this.output,
      metadata: { ...this.metadata, ...metadata },
    })
  }

  /**
   * Create a logger with a different level
   * @param level - New log level
   */
  withLevel(level: LogLevel): Logger {
    return new Logger({
      level,
      prefix: this.prefix,
      timestamp: this.timestamp,
      output: this.output,
      metadata: this.metadata,
    })
  }
}

/**
 * Default logger instance
 * Can be configured at application startup
 */
export const defaultLogger = new Logger({
  level: 'info',
  prefix: '[ContentBridge]',
})

/**
 * Create a new logger instance with custom configuration
 * @param options - Logger configuration
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  return new Logger(options)
}

/**
 * Convenience function for creating a child logger
 * @param name - Child logger name (will be used as prefix)
 * @param metadata - Additional metadata
 */
export function createChildLogger(
  name: string,
  metadata?: Record<string, unknown>
): Logger {
  return defaultLogger.child(`[${name}]`, metadata)
}
