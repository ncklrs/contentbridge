/**
 * Plugin utility functions
 *
 * Helpers for creating and composing plugins
 */

import type {
  ContentBridgePlugin,
  PluginContext,
  QueryHookResult,
  MutationHookResult,
  CustomBlockDefinition,
  CustomOperator,
} from './Plugin'
import type { QueryConfig, QueryResult } from '../types/query'
import type { TransactionOperation, ValidationResult } from '../service/ContentService'
import type { BaseDocument } from '../types/document'

// ============================================================================
// Plugin Creation Helpers
// ============================================================================

/**
 * Plugin builder options
 */
export interface CreatePluginOptions {
  /** Plugin name */
  name: string

  /** Plugin version */
  version: string

  /** Plugin description */
  description?: string

  /** Plugin author */
  author?: string

  /** Plugin priority (higher runs first) */
  priority?: number

  /** Initialize hook */
  onInit?: (context: PluginContext) => Promise<void> | void

  /** Destroy hook */
  onDestroy?: (context: PluginContext) => Promise<void> | void

  /** Before query hook */
  onBeforeQuery?<T = unknown>(
    query: QueryConfig<T>,
    context: PluginContext
  ): Promise<QueryHookResult<T>> | QueryHookResult<T>

  /** After query hook */
  onAfterQuery?<T = unknown>(
    result: QueryResult<T>,
    query: QueryConfig<T>,
    context: PluginContext
  ): Promise<{ result?: QueryResult<T>; skipRemaining?: boolean }> | { result?: QueryResult<T>; skipRemaining?: boolean }

  /** Before mutation hook */
  onBeforeMutation?(
    operation: TransactionOperation,
    context: PluginContext
  ): Promise<MutationHookResult> | MutationHookResult

  /** After mutation hook */
  onAfterMutation?<T extends BaseDocument = BaseDocument>(
    result: T,
    operation: TransactionOperation,
    context: PluginContext
  ): Promise<{ result?: T; skipRemaining?: boolean }> | { result?: T; skipRemaining?: boolean }

  /** Validate hook */
  onValidate?<T extends BaseDocument = BaseDocument>(
    document: Partial<T>,
    context: PluginContext
  ): Promise<ValidationResult> | ValidationResult

  /** Custom blocks */
  customBlocks?: CustomBlockDefinition[]

  /** Custom operators */
  customOperators?: CustomOperator[]
}

/**
 * Helper function to create a plugin with type safety
 *
 * @param options - Plugin configuration
 * @returns ContentBridge plugin
 *
 * @example
 * ```typescript
 * const myPlugin = createPlugin({
 *   name: 'my-plugin',
 *   version: '1.0.0',
 *   description: 'My custom plugin',
 *   priority: 10,
 *
 *   async onInit(context) {
 *     context.logger.info('Plugin initialized')
 *   },
 *
 *   async onBeforeQuery(query) {
 *     // Add default filter
 *     return {
 *       query: {
 *         ...query,
 *         filter: [
 *           ...(query.filter ?? []),
 *           { field: 'deleted', operator: '!=', value: true }
 *         ]
 *       }
 *     }
 *   }
 * })
 * ```
 */
export function createPlugin(options: CreatePluginOptions): ContentBridgePlugin {
  const {
    name,
    version,
    description,
    author,
    priority,
    onInit,
    onDestroy,
    onBeforeQuery,
    onAfterQuery,
    onBeforeMutation,
    onAfterMutation,
    onValidate,
    customBlocks,
    customOperators,
  } = options

  return {
    name,
    version,
    description,
    author,
    priority,
    onInit,
    onDestroy,
    onBeforeQuery,
    onAfterQuery,
    onBeforeMutation,
    onAfterMutation,
    onValidate,
    customBlocks,
    customOperators,
  }
}

// ============================================================================
// Plugin Composition
// ============================================================================

/**
 * Compose multiple plugins into a single plugin
 *
 * Hooks are executed in the order plugins are provided.
 * The composed plugin has the name and version of the first plugin.
 *
 * @param plugins - Plugins to compose
 * @param name - Optional name for composed plugin
 * @param version - Optional version for composed plugin
 * @returns Composed plugin
 *
 * @example
 * ```typescript
 * const combined = composePlugins(
 *   [loggingPlugin, cachePlugin, validationPlugin],
 *   'combined',
 *   '1.0.0'
 * )
 * ```
 */
export function composePlugins(
  plugins: ContentBridgePlugin[],
  name?: string,
  version?: string
): ContentBridgePlugin {
  if (plugins.length === 0) {
    throw new Error('Cannot compose empty plugin array')
  }

  const firstPlugin = plugins[0]

  return {
    name: name ?? `${firstPlugin.name}-composed`,
    version: version ?? firstPlugin.version,
    description: `Composed plugin: ${plugins.map(p => p.name).join(', ')}`,
    priority: Math.max(...plugins.map(p => p.priority ?? 0)),

    async onInit(context) {
      for (const plugin of plugins) {
        if (plugin.onInit) {
          await plugin.onInit(context)
        }
      }
    },

    async onDestroy(context) {
      // Execute destroy in reverse order
      for (const plugin of [...plugins].reverse()) {
        if (plugin.onDestroy) {
          await plugin.onDestroy(context)
        }
      }
    },

    async onBeforeQuery(query, context) {
      let currentQuery = query
      let earlyResult: QueryResult<any> | undefined

      for (const plugin of plugins) {
        if (!plugin.onBeforeQuery) continue

        const result = await plugin.onBeforeQuery(currentQuery, context)

        if (result.query) {
          currentQuery = result.query
        }

        if (result.result) {
          earlyResult = result.result
          if (result.skipRemaining) {
            break
          }
        }

        if (result.skipRemaining) {
          break
        }
      }

      return { query: currentQuery, result: earlyResult }
    },

    async onAfterQuery(result, query, context) {
      let currentResult = result

      for (const plugin of plugins) {
        if (!plugin.onAfterQuery) continue

        const hookResult = await plugin.onAfterQuery(currentResult, query, context)

        if (hookResult.result) {
          currentResult = hookResult.result
        }

        if (hookResult.skipRemaining) {
          break
        }
      }

      return { result: currentResult }
    },

    async onBeforeMutation(operation, context) {
      let currentOperation = operation
      let skip = false

      for (const plugin of plugins) {
        if (!plugin.onBeforeMutation) continue

        const result = await plugin.onBeforeMutation(currentOperation, context)

        if (result.operation) {
          currentOperation = result.operation
        }

        if (result.skip) {
          skip = true
          break
        }

        if (result.skipRemaining) {
          break
        }
      }

      return { operation: currentOperation, skip }
    },

    async onAfterMutation(result, operation, context) {
      let currentResult = result

      for (const plugin of plugins) {
        if (!plugin.onAfterMutation) continue

        const hookResult = await plugin.onAfterMutation(currentResult, operation, context)

        if (hookResult.result) {
          currentResult = hookResult.result
        }

        if (hookResult.skipRemaining) {
          break
        }
      }

      return { result: currentResult }
    },

    async onValidate(document, context) {
      const allErrors: ValidationResult['errors'] = []
      const allWarnings: ValidationResult['warnings'] = []

      for (const plugin of plugins) {
        if (!plugin.onValidate) continue

        const result = await plugin.onValidate(document, context)

        if (result.errors) {
          allErrors.push(...result.errors)
        }
        if (result.warnings) {
          allWarnings.push(...result.warnings)
        }
      }

      return {
        valid: allErrors.length === 0,
        errors: allErrors.length > 0 ? allErrors : undefined,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
      }
    },

    customBlocks: plugins.flatMap(p => p.customBlocks ?? []),
    customOperators: plugins.flatMap(p => p.customOperators ?? []),
  }
}

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Extract the plugin type from a plugin config
 */
export type ExtractPlugin<T> = T extends { plugin: infer P } ? P : T

/**
 * Extract plugin names from an array of plugins
 */
export type PluginNamesFromArray<T extends readonly ContentBridgePlugin[]> = T[number]['name']

/**
 * Create a type-safe plugin configuration
 */
export interface TypedPluginConfig<
  TPlugin extends ContentBridgePlugin = ContentBridgePlugin,
  TOptions = Record<string, unknown>
> {
  plugin: TPlugin
  options?: TOptions
  enabled?: boolean
}

// ============================================================================
// Conditional Hook Helpers
// ============================================================================

/**
 * Create a conditional plugin that only executes for specific document types
 *
 * @param basePlugin - Base plugin to wrap
 * @param types - Document types to apply plugin to
 * @returns Wrapped plugin
 *
 * @example
 * ```typescript
 * const conditionalPlugin = createConditionalPlugin(
 *   validationPlugin,
 *   ['post', 'page']
 * )
 * ```
 */
export function createConditionalPlugin(
  basePlugin: ContentBridgePlugin,
  types: string[]
): ContentBridgePlugin {
  const typeSet = new Set(types)

  return {
    ...basePlugin,
    name: `${basePlugin.name}-conditional`,

    async onBeforeQuery(query, context) {
      // Check if query type matches
      const queryTypes = Array.isArray(query.type) ? query.type : [query.type]
      const matches = queryTypes.some(t => typeSet.has(t))

      if (!matches || !basePlugin.onBeforeQuery) {
        return {}
      }

      return basePlugin.onBeforeQuery(query, context)
    },

    async onAfterQuery(result, query, context) {
      const queryTypes = Array.isArray(query.type) ? query.type : [query.type]
      const matches = queryTypes.some(t => typeSet.has(t))

      if (!matches || !basePlugin.onAfterQuery) {
        return { result }
      }

      return basePlugin.onAfterQuery(result, query, context)
    },

    async onBeforeMutation(operation, context) {
      // Check document type
      const docType = 'document' in operation ? (operation.document as any)?._type : undefined
      const matches = docType && typeSet.has(docType)

      if (!matches || !basePlugin.onBeforeMutation) {
        return {}
      }

      return basePlugin.onBeforeMutation(operation, context)
    },

    async onAfterMutation(result, operation, context) {
      const matches = typeSet.has(result._type)

      if (!matches || !basePlugin.onAfterMutation) {
        return { result }
      }

      return basePlugin.onAfterMutation(result, operation, context)
    },

    async onValidate(document, context) {
      const matches = document._type && typeSet.has(document._type)

      if (!matches || !basePlugin.onValidate) {
        return { valid: true }
      }

      return basePlugin.onValidate(document, context)
    },
  }
}

/**
 * Create a plugin that only executes in specific environments
 *
 * @param basePlugin - Base plugin to wrap
 * @param environments - Environments to run in (e.g., 'production', 'development')
 * @returns Wrapped plugin
 *
 * @example
 * ```typescript
 * const prodOnlyPlugin = createEnvironmentPlugin(
 *   cachePlugin,
 *   ['production']
 * )
 * ```
 */
export function createEnvironmentPlugin(
  basePlugin: ContentBridgePlugin,
  environments: string[]
): ContentBridgePlugin {
  const envSet = new Set(environments)
  const currentEnv = process.env.NODE_ENV || 'development'
  const isEnabled = envSet.has(currentEnv)

  return {
    ...basePlugin,
    name: `${basePlugin.name}-env`,

    async onInit(context) {
      if (isEnabled && basePlugin.onInit) {
        await basePlugin.onInit(context)
      }
    },

    async onDestroy(context) {
      if (isEnabled && basePlugin.onDestroy) {
        await basePlugin.onDestroy(context)
      }
    },

    async onBeforeQuery(query, context) {
      if (!isEnabled || !basePlugin.onBeforeQuery) {
        return {}
      }
      return basePlugin.onBeforeQuery(query, context)
    },

    async onAfterQuery(result, query, context) {
      if (!isEnabled || !basePlugin.onAfterQuery) {
        return { result }
      }
      return basePlugin.onAfterQuery(result, query, context)
    },

    async onBeforeMutation(operation, context) {
      if (!isEnabled || !basePlugin.onBeforeMutation) {
        return {}
      }
      return basePlugin.onBeforeMutation(operation, context)
    },

    async onAfterMutation(result, operation, context) {
      if (!isEnabled || !basePlugin.onAfterMutation) {
        return { result }
      }
      return basePlugin.onAfterMutation(result, operation, context)
    },

    async onValidate(document, context) {
      if (!isEnabled || !basePlugin.onValidate) {
        return { valid: true }
      }
      return basePlugin.onValidate(document, context)
    },
  }
}
