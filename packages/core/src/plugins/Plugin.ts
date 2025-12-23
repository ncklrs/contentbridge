/**
 * Plugin system for ContentBridge
 *
 * Allows extending ContentBridge functionality with custom hooks,
 * operators, and blocks. Plugins can intercept queries, mutations,
 * and add custom functionality.
 */

import type { BaseAdapter, AdapterConfig } from '../adapters/BaseAdapter'
import type { Logger } from '../utils/logger'
import type { QueryConfig, QueryResult } from '../types/query'
import type {
  TransactionOperation,
  ValidationResult,
} from '../service/ContentService'
import type { BaseDocument } from '../types/document'
import type { UniversalBlock } from '../types/richtext'

// ============================================================================
// Plugin Context
// ============================================================================

/**
 * Context provided to plugins during initialization and hooks
 * Contains access to the adapter, config, and logger
 */
export interface PluginContext {
  /** The CMS adapter instance */
  adapter: BaseAdapter<any>

  /** Adapter configuration */
  config: AdapterConfig

  /** Logger instance for the plugin */
  logger: Logger

  /** Plugin metadata */
  metadata?: Record<string, unknown>
}

// ============================================================================
// Custom Extensions
// ============================================================================

/**
 * Custom block definition for rich text content
 * Plugins can register new block types
 *
 * @example
 * ```typescript
 * {
 *   name: 'codeBlock',
 *   type: 'block',
 *   renderer: (block) => `<pre><code>${block.code}</code></pre>`,
 *   validator: (block) => !!block.code
 * }
 * ```
 */
export interface CustomBlockDefinition {
  /** Unique block type name */
  name: string

  /** Block type category */
  type: 'block' | 'inline' | 'annotation'

  /** Display name */
  title?: string

  /** Block description */
  description?: string

  /** Custom renderer function */
  renderer?: (block: UniversalBlock) => string | Promise<string>

  /** Validation function */
  validator?: (block: UniversalBlock) => boolean | ValidationResult

  /** Schema for block content */
  schema?: Record<string, unknown>

  /** Preview configuration */
  preview?: {
    select?: Record<string, string>
    prepare?: (value: unknown) => { title?: string; subtitle?: string }
  }
}

/**
 * Custom filter operator
 * Plugins can add new query operators
 *
 * @example
 * ```typescript
 * {
 *   name: 'fuzzyMatch',
 *   compile: (field, value) => `fuzzyMatch(${field}, "${value}")`,
 *   validate: (value) => typeof value === 'string'
 * }
 * ```
 */
export interface CustomOperator {
  /** Operator name */
  name: string

  /** Compile operator to native query format */
  compile: (field: string, value: unknown, context: PluginContext) => string | object

  /** Validate operator value */
  validate?: (value: unknown) => boolean

  /** Operator description */
  description?: string
}

// ============================================================================
// Hook Results
// ============================================================================

/**
 * Result from a query hook
 * Hooks can modify the query or return early with cached results
 */
export interface QueryHookResult<T = unknown> {
  /** Modified query config (if changed) */
  query?: QueryConfig<T>

  /** Early return with cached/computed results (bypasses execution) */
  result?: QueryResult<T>

  /** Skip remaining plugins in the chain */
  skipRemaining?: boolean
}

/**
 * Result from a mutation hook
 */
export interface MutationHookResult {
  /** Modified operation (if changed) */
  operation?: TransactionOperation

  /** Skip this operation */
  skip?: boolean

  /** Skip remaining plugins in the chain */
  skipRemaining?: boolean
}

// ============================================================================
// Main Plugin Interface
// ============================================================================

/**
 * ContentBridge plugin interface
 *
 * Plugins can hook into various lifecycle events to extend functionality.
 * All hooks are optional - implement only what you need.
 *
 * @example
 * ```typescript
 * const loggingPlugin: ContentBridgePlugin = {
 *   name: 'logging',
 *   version: '1.0.0',
 *
 *   async onInit(context) {
 *     context.logger.info('Logging plugin initialized')
 *   },
 *
 *   async onBeforeQuery(query) {
 *     console.log('Executing query:', query)
 *     return { query }
 *   },
 *
 *   async onAfterQuery(result) {
 *     console.log('Query returned:', result.data.length, 'documents')
 *     return { result }
 *   }
 * }
 * ```
 */
export interface ContentBridgePlugin {
  /**
   * Plugin name (must be unique)
   * @example 'cache', 'validation', 'logging'
   */
  name: string

  /**
   * Plugin version (semver)
   * @example '1.0.0', '2.1.3'
   */
  version: string

  /**
   * Plugin description
   */
  description?: string

  /**
   * Plugin author
   */
  author?: string

  /**
   * Plugin priority (higher = runs first)
   * @default 0
   */
  priority?: number

  // ==========================================================================
  // Lifecycle Hooks
  // ==========================================================================

  /**
   * Called when plugin is registered
   * Use for initialization, validation, setup
   *
   * @param context - Plugin context with adapter and config
   * @throws Error if initialization fails
   */
  onInit?(context: PluginContext): Promise<void> | void

  /**
   * Called when plugin is unregistered
   * Use for cleanup, teardown
   */
  onDestroy?(context: PluginContext): Promise<void> | void

  // ==========================================================================
  // Query Hooks
  // ==========================================================================

  /**
   * Called before a query is executed
   * Can modify the query or return cached results
   *
   * @param query - Query configuration
   * @param context - Plugin context
   * @returns Modified query or early result
   *
   * @example
   * ```typescript
   * // Add default filters
   * async onBeforeQuery(query) {
   *   return {
   *     query: {
   *       ...query,
   *       filter: [
   *         ...(query.filter ?? []),
   *         { field: 'deleted', operator: '!=', value: true }
   *       ]
   *     }
   *   }
   * }
   *
   * // Return cached result
   * async onBeforeQuery(query) {
   *   const cached = await cache.get(query)
   *   if (cached) {
   *     return { result: cached, skipRemaining: true }
   *   }
   *   return {}
   * }
   * ```
   */
  onBeforeQuery?<T = unknown>(
    query: QueryConfig<T>,
    context: PluginContext
  ): Promise<QueryHookResult<T>> | QueryHookResult<T>

  /**
   * Called after a query is executed
   * Can modify or enrich the results
   *
   * @param result - Query results
   * @param query - Original query configuration
   * @param context - Plugin context
   * @returns Modified result
   *
   * @example
   * ```typescript
   * // Cache results
   * async onAfterQuery(result, query) {
   *   await cache.set(query, result)
   *   return { result }
   * }
   *
   * // Add computed fields
   * async onAfterQuery(result) {
   *   return {
   *     result: {
   *       ...result,
   *       data: result.data.map(doc => ({
   *         ...doc,
   *         _computed: computeSomething(doc)
   *       }))
   *     }
   *   }
   * }
   * ```
   */
  onAfterQuery?<T = unknown>(
    result: QueryResult<T>,
    query: QueryConfig<T>,
    context: PluginContext
  ): Promise<{ result?: QueryResult<T>; skipRemaining?: boolean }> | { result?: QueryResult<T>; skipRemaining?: boolean }

  // ==========================================================================
  // Mutation Hooks
  // ==========================================================================

  /**
   * Called before a mutation is executed
   * Can modify, validate, or skip the operation
   *
   * @param operation - Mutation operation
   * @param context - Plugin context
   * @returns Modified operation or skip flag
   *
   * @example
   * ```typescript
   * // Add audit fields
   * async onBeforeMutation(operation) {
   *   if (operation.type === 'create') {
   *     return {
   *       operation: {
   *         ...operation,
   *         document: {
   *           ...operation.document,
   *           _createdBy: 'current-user-id',
   *           _createdAt: new Date().toISOString()
   *         }
   *       }
   *     }
   *   }
   *   return {}
   * }
   *
   * // Validate and skip if invalid
   * async onBeforeMutation(operation, context) {
   *   const valid = await validate(operation.document)
   *   if (!valid) {
   *     context.logger.error('Invalid document')
   *     return { skip: true }
   *   }
   *   return {}
   * }
   * ```
   */
  onBeforeMutation?(
    operation: TransactionOperation,
    context: PluginContext
  ): Promise<MutationHookResult> | MutationHookResult

  /**
   * Called after a mutation is executed
   * Can perform side effects like cache invalidation
   *
   * @param result - Mutation result document
   * @param operation - Original mutation operation
   * @param context - Plugin context
   * @returns Modified result
   *
   * @example
   * ```typescript
   * // Invalidate cache
   * async onAfterMutation(result, operation) {
   *   await cache.invalidate([operation.document._type])
   *   return { result }
   * }
   *
   * // Send webhook
   * async onAfterMutation(result, operation, context) {
   *   if (operation.type === 'create') {
   *     await sendWebhook('document.created', result)
   *   }
   *   return { result }
   * }
   * ```
   */
  onAfterMutation?<T extends BaseDocument = BaseDocument>(
    result: T,
    operation: TransactionOperation,
    context: PluginContext
  ): Promise<{ result?: T; skipRemaining?: boolean }> | { result?: T; skipRemaining?: boolean }

  // ==========================================================================
  // Validation Hooks
  // ==========================================================================

  /**
   * Called when validating a document
   * Can add custom validation rules
   *
   * @param document - Document to validate
   * @param context - Plugin context
   * @returns Validation result
   *
   * @example
   * ```typescript
   * async onValidate(document, context) {
   *   const errors = []
   *   if (document._type === 'post' && !document.title) {
   *     errors.push({
   *       path: 'title',
   *       message: 'Title is required',
   *       rule: 'required'
   *     })
   *   }
   *   return {
   *     valid: errors.length === 0,
   *     errors
   *   }
   * }
   * ```
   */
  onValidate?<T extends BaseDocument = BaseDocument>(
    document: Partial<T>,
    context: PluginContext
  ): Promise<ValidationResult> | ValidationResult

  // ==========================================================================
  // Extensions
  // ==========================================================================

  /**
   * Custom block definitions for rich text
   * Registered automatically when plugin is loaded
   */
  customBlocks?: CustomBlockDefinition[]

  /**
   * Custom filter operators
   * Registered automatically when plugin is loaded
   */
  customOperators?: CustomOperator[]
}

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Type guard to check if a value is a valid plugin
 */
export function isContentBridgePlugin(value: unknown): value is ContentBridgePlugin {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'version' in value &&
    typeof (value as ContentBridgePlugin).name === 'string' &&
    typeof (value as ContentBridgePlugin).version === 'string'
  )
}

/**
 * Extract plugin names from a list of plugins
 */
export type PluginNames<T extends readonly ContentBridgePlugin[]> = T[number]['name']

/**
 * Plugin configuration with options
 */
export interface PluginConfig<TOptions = Record<string, unknown>> {
  plugin: ContentBridgePlugin
  options?: TOptions
  enabled?: boolean
}
