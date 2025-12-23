/**
 * PluginRegistry - Manages plugin lifecycle and execution
 *
 * Handles registration, initialization, and execution of plugins.
 * Executes plugin hooks in priority order with error handling.
 */

import type {
  ContentBridgePlugin,
  PluginContext,
  QueryHookResult,
  MutationHookResult,
  CustomBlockDefinition,
  CustomOperator,
} from './Plugin'
import type { BaseAdapter, AdapterConfig } from '../adapters/BaseAdapter'
import type { Logger } from '../utils/logger'
import type { QueryConfig, QueryResult } from '../types/query'
import type {
  TransactionOperation,
  ValidationResult,
} from '../service/ContentService'
import type { BaseDocument } from '../types/document'
import { createChildLogger } from '../utils/logger'

// ============================================================================
// Registry Configuration
// ============================================================================

/**
 * Configuration options for PluginRegistry
 */
export interface PluginRegistryConfig {
  /**
   * Adapter instance
   */
  adapter: BaseAdapter<any>

  /**
   * Adapter configuration
   */
  config: AdapterConfig

  /**
   * Logger instance
   */
  logger?: Logger

  /**
   * Stop executing plugins if one throws an error
   * @default false
   */
  stopOnError?: boolean

  /**
   * Maximum time (ms) to wait for a plugin hook to execute
   * @default 5000
   */
  hookTimeout?: number
}

/**
 * Registered plugin with metadata
 */
interface RegisteredPlugin {
  plugin: ContentBridgePlugin
  context: PluginContext
  enabled: boolean
}

// ============================================================================
// Plugin Registry
// ============================================================================

/**
 * Central registry for managing ContentBridge plugins
 *
 * @example
 * ```typescript
 * const registry = new PluginRegistry({
 *   adapter: sanityAdapter,
 *   config: { projectId: 'abc123' }
 * })
 *
 * // Register plugins
 * await registry.register(loggingPlugin)
 * await registry.register(cachePlugin, { enabled: true })
 *
 * // Execute hooks
 * const { query } = await registry.executeBeforeQueryHooks(queryConfig)
 * const { result } = await registry.executeAfterQueryHooks(result, queryConfig)
 *
 * // Cleanup
 * await registry.unregisterAll()
 * ```
 */
export class PluginRegistry {
  private plugins = new Map<string, RegisteredPlugin>()
  private customBlocks = new Map<string, CustomBlockDefinition>()
  private customOperators = new Map<string, CustomOperator>()
  private readonly adapter: BaseAdapter<any>
  private readonly config: AdapterConfig
  private readonly logger: Logger
  private readonly stopOnError: boolean
  private readonly hookTimeout: number

  constructor(config: PluginRegistryConfig) {
    this.adapter = config.adapter
    this.config = config.config
    this.logger = config.logger ?? createChildLogger('plugins')
    this.stopOnError = config.stopOnError ?? false
    this.hookTimeout = config.hookTimeout ?? 5000
  }

  // ==========================================================================
  // Plugin Management
  // ==========================================================================

  /**
   * Register a plugin
   *
   * @param plugin - Plugin to register
   * @param options - Registration options
   * @throws Error if plugin with same name already registered
   *
   * @example
   * ```typescript
   * await registry.register(loggingPlugin)
   * await registry.register(cachePlugin, { enabled: false })
   * ```
   */
  async register(
    plugin: ContentBridgePlugin,
    options: { enabled?: boolean; metadata?: Record<string, unknown> } = {}
  ): Promise<void> {
    const { enabled = true, metadata } = options

    // Check for duplicate
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`)
    }

    // Create plugin context
    const context: PluginContext = {
      adapter: this.adapter,
      config: this.config,
      logger: this.logger.child(`[${plugin.name}]`),
      metadata,
    }

    // Register custom blocks
    if (plugin.customBlocks) {
      for (const block of plugin.customBlocks) {
        if (this.customBlocks.has(block.name)) {
          this.logger.warn(`Custom block "${block.name}" from plugin "${plugin.name}" overwrites existing block`)
        }
        this.customBlocks.set(block.name, block)
      }
    }

    // Register custom operators
    if (plugin.customOperators) {
      for (const operator of plugin.customOperators) {
        if (this.customOperators.has(operator.name)) {
          this.logger.warn(`Custom operator "${operator.name}" from plugin "${plugin.name}" overwrites existing operator`)
        }
        this.customOperators.set(operator.name, operator)
      }
    }

    // Store plugin
    this.plugins.set(plugin.name, {
      plugin,
      context,
      enabled,
    })

    // Initialize plugin
    if (enabled && plugin.onInit) {
      try {
        this.logger.debug(`Initializing plugin: ${plugin.name} v${plugin.version}`)
        await this.executeWithTimeout(
          () => plugin.onInit!(context),
          this.hookTimeout,
          `Plugin "${plugin.name}" onInit timeout`
        )
        this.logger.info(`Plugin registered: ${plugin.name} v${plugin.version}`)
      } catch (error) {
        this.logger.error(`Failed to initialize plugin "${plugin.name}"`, error as Error)
        // Remove failed plugin
        this.plugins.delete(plugin.name)
        throw error
      }
    } else {
      this.logger.info(`Plugin registered (disabled): ${plugin.name} v${plugin.version}`)
    }
  }

  /**
   * Unregister a plugin
   *
   * @param name - Plugin name to unregister
   * @returns true if plugin was found and unregistered
   *
   * @example
   * ```typescript
   * await registry.unregister('logging')
   * ```
   */
  async unregister(name: string): Promise<boolean> {
    const registered = this.plugins.get(name)
    if (!registered) {
      return false
    }

    const { plugin, context, enabled } = registered

    // Call onDestroy hook
    if (enabled && plugin.onDestroy) {
      try {
        this.logger.debug(`Destroying plugin: ${name}`)
        await this.executeWithTimeout(
          () => plugin.onDestroy!(context),
          this.hookTimeout,
          `Plugin "${name}" onDestroy timeout`
        )
      } catch (error) {
        this.logger.error(`Error destroying plugin "${name}"`, error as Error)
        // Continue with unregistration even if destroy fails
      }
    }

    // Remove custom blocks
    if (plugin.customBlocks) {
      for (const block of plugin.customBlocks) {
        this.customBlocks.delete(block.name)
      }
    }

    // Remove custom operators
    if (plugin.customOperators) {
      for (const operator of plugin.customOperators) {
        this.customOperators.delete(operator.name)
      }
    }

    this.plugins.delete(name)
    this.logger.info(`Plugin unregistered: ${name}`)
    return true
  }

  /**
   * Unregister all plugins
   *
   * @example
   * ```typescript
   * await registry.unregisterAll()
   * ```
   */
  async unregisterAll(): Promise<void> {
    const names = Array.from(this.plugins.keys())
    for (const name of names) {
      await this.unregister(name)
    }
  }

  /**
   * Enable or disable a plugin
   *
   * @param name - Plugin name
   * @param enabled - Whether to enable the plugin
   *
   * @example
   * ```typescript
   * registry.setEnabled('cache', false)
   * ```
   */
  setEnabled(name: string, enabled: boolean): void {
    const registered = this.plugins.get(name)
    if (!registered) {
      throw new Error(`Plugin "${name}" is not registered`)
    }
    registered.enabled = enabled
    this.logger.debug(`Plugin "${name}" ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Check if a plugin is registered
   */
  has(name: string): boolean {
    return this.plugins.has(name)
  }

  /**
   * Get a registered plugin
   */
  get(name: string): ContentBridgePlugin | undefined {
    return this.plugins.get(name)?.plugin
  }

  /**
   * Get all registered plugin names
   */
  getPluginNames(): string[] {
    return Array.from(this.plugins.keys())
  }

  /**
   * Get custom blocks
   */
  getCustomBlocks(): CustomBlockDefinition[] {
    return Array.from(this.customBlocks.values())
  }

  /**
   * Get a custom block by name
   */
  getCustomBlock(name: string): CustomBlockDefinition | undefined {
    return this.customBlocks.get(name)
  }

  /**
   * Get custom operators
   */
  getCustomOperators(): CustomOperator[] {
    return Array.from(this.customOperators.values())
  }

  /**
   * Get a custom operator by name
   */
  getCustomOperator(name: string): CustomOperator | undefined {
    return this.customOperators.get(name)
  }

  // ==========================================================================
  // Hook Execution
  // ==========================================================================

  /**
   * Execute onBeforeQuery hooks
   *
   * @param query - Query configuration
   * @returns Modified query or early result
   *
   * @example
   * ```typescript
   * const { query, result } = await registry.executeBeforeQueryHooks(queryConfig)
   * if (result) {
   *   return result // Early return from cache
   * }
   * ```
   */
  async executeBeforeQueryHooks<T = unknown>(
    query: QueryConfig<T>
  ): Promise<{ query: QueryConfig<T>; result?: QueryResult<T> }> {
    let currentQuery = query
    let earlyResult: QueryResult<T> | undefined

    for (const registered of this.getSortedPlugins()) {
      if (!registered.enabled || !registered.plugin.onBeforeQuery) {
        continue
      }

      try {
        const hookResult = await this.executeWithTimeout<QueryHookResult<T>>(
          () => registered.plugin.onBeforeQuery!(currentQuery, registered.context),
          this.hookTimeout,
          `Plugin "${registered.plugin.name}" onBeforeQuery timeout`
        )

        // Update query if provided
        if (hookResult.query) {
          currentQuery = hookResult.query
        }

        // Check for early result
        if (hookResult.result) {
          earlyResult = hookResult.result
          if (hookResult.skipRemaining) {
            break
          }
        }

        // Check for skip flag
        if (hookResult.skipRemaining) {
          break
        }
      } catch (error) {
        this.handleHookError('onBeforeQuery', registered.plugin.name, error as Error)
        if (this.stopOnError) {
          throw error
        }
      }
    }

    return { query: currentQuery, result: earlyResult }
  }

  /**
   * Execute onAfterQuery hooks
   *
   * @param result - Query result
   * @param query - Original query configuration
   * @returns Modified result
   */
  async executeAfterQueryHooks<T = unknown>(
    result: QueryResult<T>,
    query: QueryConfig<T>
  ): Promise<QueryResult<T>> {
    let currentResult = result

    for (const registered of this.getSortedPlugins()) {
      if (!registered.enabled || !registered.plugin.onAfterQuery) {
        continue
      }

      try {
        const hookResult = await this.executeWithTimeout(
          () => registered.plugin.onAfterQuery!(currentResult, query, registered.context),
          this.hookTimeout,
          `Plugin "${registered.plugin.name}" onAfterQuery timeout`
        )

        if (hookResult.result) {
          currentResult = hookResult.result
        }

        if (hookResult.skipRemaining) {
          break
        }
      } catch (error) {
        this.handleHookError('onAfterQuery', registered.plugin.name, error as Error)
        if (this.stopOnError) {
          throw error
        }
      }
    }

    return currentResult
  }

  /**
   * Execute onBeforeMutation hooks
   *
   * @param operation - Mutation operation
   * @returns Modified operation or skip flag
   */
  async executeBeforeMutationHooks(
    operation: TransactionOperation
  ): Promise<{ operation: TransactionOperation; skip: boolean }> {
    let currentOperation = operation
    let skip = false

    for (const registered of this.getSortedPlugins()) {
      if (!registered.enabled || !registered.plugin.onBeforeMutation) {
        continue
      }

      try {
        const hookResult = await this.executeWithTimeout<MutationHookResult>(
          () => registered.plugin.onBeforeMutation!(currentOperation, registered.context),
          this.hookTimeout,
          `Plugin "${registered.plugin.name}" onBeforeMutation timeout`
        )

        if (hookResult.operation) {
          currentOperation = hookResult.operation
        }

        if (hookResult.skip) {
          skip = true
          break
        }

        if (hookResult.skipRemaining) {
          break
        }
      } catch (error) {
        this.handleHookError('onBeforeMutation', registered.plugin.name, error as Error)
        if (this.stopOnError) {
          throw error
        }
      }
    }

    return { operation: currentOperation, skip }
  }

  /**
   * Execute onAfterMutation hooks
   *
   * @param result - Mutation result
   * @param operation - Original operation
   * @returns Modified result
   */
  async executeAfterMutationHooks<T extends BaseDocument = BaseDocument>(
    result: T,
    operation: TransactionOperation
  ): Promise<T> {
    let currentResult = result

    for (const registered of this.getSortedPlugins()) {
      if (!registered.enabled || !registered.plugin.onAfterMutation) {
        continue
      }

      try {
        const hookResult = await this.executeWithTimeout(
          () => registered.plugin.onAfterMutation!(currentResult, operation, registered.context),
          this.hookTimeout,
          `Plugin "${registered.plugin.name}" onAfterMutation timeout`
        )

        if (hookResult.result) {
          currentResult = hookResult.result
        }

        if (hookResult.skipRemaining) {
          break
        }
      } catch (error) {
        this.handleHookError('onAfterMutation', registered.plugin.name, error as Error)
        if (this.stopOnError) {
          throw error
        }
      }
    }

    return currentResult
  }

  /**
   * Execute onValidate hooks
   *
   * @param document - Document to validate
   * @returns Aggregated validation results
   */
  async executeValidationHooks<T extends BaseDocument = BaseDocument>(
    document: Partial<T>
  ): Promise<ValidationResult> {
    const allErrors: ValidationResult['errors'] = []
    const allWarnings: ValidationResult['warnings'] = []

    for (const registered of this.getSortedPlugins()) {
      if (!registered.enabled || !registered.plugin.onValidate) {
        continue
      }

      try {
        const result = await this.executeWithTimeout(
          () => registered.plugin.onValidate!(document, registered.context),
          this.hookTimeout,
          `Plugin "${registered.plugin.name}" onValidate timeout`
        )

        if (result.errors) {
          allErrors.push(...result.errors)
        }
        if (result.warnings) {
          allWarnings.push(...result.warnings)
        }
      } catch (error) {
        this.handleHookError('onValidate', registered.plugin.name, error as Error)
        if (this.stopOnError) {
          throw error
        }
      }
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors.length > 0 ? allErrors : undefined,
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
    }
  }

  // ==========================================================================
  // Internal Helpers
  // ==========================================================================

  /**
   * Get plugins sorted by priority (highest first)
   */
  private getSortedPlugins(): RegisteredPlugin[] {
    return Array.from(this.plugins.values()).sort((a, b) => {
      const priorityA = a.plugin.priority ?? 0
      const priorityB = b.plugin.priority ?? 0
      return priorityB - priorityA // Higher priority first
    })
  }

  /**
   * Execute a function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T> | T,
    timeout: number,
    errorMessage: string
  ): Promise<T> {
    const result = fn()

    // If not a promise, return immediately
    if (!(result instanceof Promise)) {
      return result
    }

    return Promise.race([
      result,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeout)
      ),
    ])
  }

  /**
   * Handle hook execution errors
   */
  private handleHookError(hookName: string, pluginName: string, error: Error): void {
    this.logger.error(`Error in ${hookName} hook for plugin "${pluginName}"`, error, {
      hook: hookName,
      plugin: pluginName,
    })
  }
}
