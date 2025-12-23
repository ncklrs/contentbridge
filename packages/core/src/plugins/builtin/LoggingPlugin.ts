/**
 * LoggingPlugin - Built-in plugin for logging all operations
 *
 * Logs queries, mutations, and validation operations.
 * Useful for debugging and monitoring.
 */

import { createPlugin } from '../utils'
import type { LogLevel } from '../../utils/logger'

/**
 * Logging plugin configuration
 */
export interface LoggingPluginOptions {
  /**
   * Log level for operations
   * @default 'debug'
   */
  level?: LogLevel

  /**
   * Log query operations
   * @default true
   */
  logQueries?: boolean

  /**
   * Log mutation operations
   * @default true
   */
  logMutations?: boolean

  /**
   * Log validation operations
   * @default true
   */
  logValidations?: boolean

  /**
   * Include full query/mutation details
   * @default false
   */
  verbose?: boolean

  /**
   * Include timing information
   * @default true
   */
  includeTiming?: boolean
}

/**
 * Helper to log at the configured level
 */
function logAtLevel(
  logger: any,
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): void {
  switch (level) {
    case 'debug':
      logger.debug(message, context)
      break
    case 'info':
      logger.info(message, context)
      break
    case 'warn':
      logger.warn(message, context)
      break
    case 'error':
      logger.error(message)
      break
  }
}

/**
 * Create a logging plugin
 *
 * @param options - Logging configuration
 * @returns Logging plugin
 *
 * @example
 * ```typescript
 * import { createLoggingPlugin } from '@contentbridge/core/plugins'
 *
 * const loggingPlugin = createLoggingPlugin({
 *   level: 'debug',
 *   verbose: true,
 *   includeTiming: true
 * })
 *
 * await registry.register(loggingPlugin)
 * ```
 */
export function createLoggingPlugin(options: LoggingPluginOptions = {}) {
  const {
    level = 'debug',
    logQueries = true,
    logMutations = true,
    logValidations = true,
    verbose = false,
    includeTiming = true,
  } = options

  return createPlugin({
    name: 'logging',
    version: '1.0.0',
    description: 'Logs all ContentBridge operations',
    author: 'ContentBridge',
    priority: -100, // Run last to see final state

    onInit(context) {
      context.logger.info('Logging plugin initialized', {
        level,
        logQueries,
        logMutations,
        logValidations,
      })
    },

    async onBeforeQuery(query, context) {
      if (!logQueries) {
        return {}
      }

      const startTime = Date.now()

      // Store start time for timing calculation
      const metadata = { startTime }

      const logContext = verbose
        ? {
            type: query.type,
            filter: query.filter,
            limit: query.limit,
            offset: query.offset,
          }
        : {
            type: query.type,
            hasFilter: !!query.filter?.length,
            limit: query.limit,
          }

      logAtLevel(context.logger, level, 'Query executing', logContext)

      // Pass metadata through context (not modifying query)
      return { query: { ...query, params: { ...query.params, _logMetadata: metadata } } }
    },

    async onAfterQuery(result, query, context) {
      if (!logQueries) {
        return { result }
      }

      const metadata = (query.params as any)?._logMetadata
      const duration = metadata ? Date.now() - metadata.startTime : undefined

      const logContext = verbose
        ? {
            type: query.type,
            count: result.data.length,
            total: result.total,
            cacheStatus: result.cacheStatus,
            timing: includeTiming ? (duration ?? result.timing) : undefined,
          }
        : {
            type: query.type,
            count: result.data.length,
            timing: includeTiming ? (duration ?? result.timing) : undefined,
          }

      logAtLevel(context.logger, level, 'Query completed', logContext)

      return { result }
    },

    async onBeforeMutation(operation, context) {
      if (!logMutations) {
        return {}
      }

      const logContext = verbose
        ? {
            type: operation.type,
            operation,
          }
        : (() => {
            const summary: Record<string, unknown> = {
              type: operation.type,
            }
            if (operation.type === 'create' && 'document' in operation) {
              summary.documentType = (operation.document as any)._type
            } else if ('id' in operation) {
              summary.id = operation.id
            }
            return summary
          })()

      logAtLevel(context.logger, level, 'Mutation executing', logContext)

      return {}
    },

    async onAfterMutation(result, operation, context) {
      if (!logMutations) {
        return { result }
      }

      const logContext = verbose
        ? {
            type: operation.type,
            result,
          }
        : {
            type: operation.type,
            documentType: result._type,
            id: result._id,
          }

      logAtLevel(context.logger, level, 'Mutation completed', logContext)

      return { result }
    },

    async onValidate(document, context) {
      if (!logValidations) {
        return { valid: true }
      }

      logAtLevel(context.logger, level, 'Validating document', {
        type: document._type,
        id: document._id,
      })

      // This plugin doesn't perform validation, just logs it
      return { valid: true }
    },
  })
}

/**
 * Default logging plugin instance
 */
export const loggingPlugin = createLoggingPlugin()
