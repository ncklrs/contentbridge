/**
 * QueryBuilder - Fluent API for building type-safe queries
 *
 * Provides a chainable interface for constructing queries that compile to QueryConfig.
 * Adapters can then translate QueryConfig to their native query format (GROQ, GraphQL, etc.)
 */

import type {
  QueryConfig,
  FilterCondition,
  FilterOperator,
  Projection,
  ExpandedProjection,
  CacheOptions,
  QueryResult,
  SingleResult,
} from '../types/query'
import type { BaseDocument } from '../types/document'

/**
 * Fluent query builder
 *
 * @example
 * ```typescript
 * const posts = await queryBuilder
 *   .where('status', '==', 'published')
 *   .where('featured', '==', true)
 *   .orderBy('publishedAt', 'desc')
 *   .limit(10)
 *   .cache({ tags: ['posts'], ttl: 3600 })
 *   .getMany()
 * ```
 */
export class QueryBuilder<T extends BaseDocument = BaseDocument> {
  private config: QueryConfig<T>

  /**
   * Execute function for running the compiled query
   * Provided by the ContentService implementation
   */
  private executor: QueryExecutor<T>

  constructor(
    type: string | string[],
    executor: QueryExecutor<T>,
    initialConfig?: Partial<QueryConfig<T>>
  ) {
    this.config = {
      type,
      filter: [],
      ...initialConfig,
    }
    this.executor = executor
  }

  // ==========================================================================
  // FILTERING
  // ==========================================================================

  /**
   * Add a filter condition
   *
   * @example
   * ```typescript
   * .where('status', '==', 'published')
   * .where('views', '>', 100)
   * .where('tags', 'contains', 'javascript')
   * ```
   */
  where<K extends keyof T>(
    field: K & string,
    operator: FilterOperator,
    value: unknown
  ): this {
    this.config.filter = this.config.filter || []
    this.config.filter.push({ field, operator, value })
    return this
  }

  /**
   * Shorthand for equality check
   *
   * @example
   * ```typescript
   * .equals('status', 'published')
   * ```
   */
  equals<K extends keyof T>(field: K & string, value: unknown): this {
    return this.where(field, '==', value)
  }

  /**
   * Shorthand for inequality check
   *
   * @example
   * ```typescript
   * .notEquals('status', 'draft')
   * ```
   */
  notEquals<K extends keyof T>(field: K & string, value: unknown): this {
    return this.where(field, '!=', value)
  }

  /**
   * Check if field value is in array
   *
   * @example
   * ```typescript
   * .in('status', ['published', 'featured'])
   * ```
   */
  in<K extends keyof T>(field: K & string, values: unknown[]): this {
    return this.where(field, 'in', values)
  }

  /**
   * Check if field value is NOT in array
   *
   * @example
   * ```typescript
   * .notIn('status', ['draft', 'archived'])
   * ```
   */
  notIn<K extends keyof T>(field: K & string, values: unknown[]): this {
    return this.where(field, 'nin', values)
  }

  /**
   * Check if array field contains value
   *
   * @example
   * ```typescript
   * .contains('tags', 'javascript')
   * ```
   */
  contains<K extends keyof T>(field: K & string, value: unknown): this {
    return this.where(field, 'contains', value)
  }

  /**
   * Check if array field contains any of the values
   *
   * @example
   * ```typescript
   * .containsAny('tags', ['javascript', 'typescript'])
   * ```
   */
  containsAny<K extends keyof T>(field: K & string, values: unknown[]): this {
    return this.where(field, 'containsAny', values)
  }

  /**
   * Check if array field contains all values
   *
   * @example
   * ```typescript
   * .containsAll('tags', ['javascript', 'typescript'])
   * ```
   */
  containsAll<K extends keyof T>(field: K & string, values: unknown[]): this {
    return this.where(field, 'containsAll', values)
  }

  /**
   * Check if field is defined (exists and not null)
   *
   * @example
   * ```typescript
   * .defined('publishedAt')
   * ```
   */
  defined<K extends keyof T>(field: K & string): this {
    return this.where(field, 'defined', true)
  }

  /**
   * Check if field is undefined (doesn't exist or is null)
   *
   * @example
   * ```typescript
   * .undefined('archivedAt')
   * ```
   */
  undefined<K extends keyof T>(field: K & string): this {
    return this.where(field, 'undefined', true)
  }

  /**
   * Full-text search match
   *
   * @example
   * ```typescript
   * .match('title', 'javascript tutorial')
   * ```
   */
  match<K extends keyof T>(field: K & string, query: string): this {
    return this.where(field, 'match', query)
  }

  /**
   * String starts with
   *
   * @example
   * ```typescript
   * .startsWith('slug', 'blog-')
   * ```
   */
  startsWith<K extends keyof T>(field: K & string, prefix: string): this {
    return this.where(field, 'startsWith', prefix)
  }

  /**
   * String ends with
   *
   * @example
   * ```typescript
   * .endsWith('email', '@example.com')
   * ```
   */
  endsWith<K extends keyof T>(field: K & string, suffix: string): this {
    return this.where(field, 'endsWith', suffix)
  }

  /**
   * Check if document references another document
   *
   * @example
   * ```typescript
   * .references('author', 'author-123')
   * ```
   */
  references<K extends keyof T>(field: K & string, targetId: string): this {
    return this.where(field, 'references', targetId)
  }

  /**
   * Greater than
   *
   * @example
   * ```typescript
   * .greaterThan('views', 100)
   * ```
   */
  greaterThan<K extends keyof T>(field: K & string, value: number | string): this {
    return this.where(field, '>', value)
  }

  /**
   * Greater than or equal
   *
   * @example
   * ```typescript
   * .greaterThanOrEqual('views', 100)
   * ```
   */
  greaterThanOrEqual<K extends keyof T>(field: K & string, value: number | string): this {
    return this.where(field, '>=', value)
  }

  /**
   * Less than
   *
   * @example
   * ```typescript
   * .lessThan('price', 100)
   * ```
   */
  lessThan<K extends keyof T>(field: K & string, value: number | string): this {
    return this.where(field, '<', value)
  }

  /**
   * Less than or equal
   *
   * @example
   * ```typescript
   * .lessThanOrEqual('price', 100)
   * ```
   */
  lessThanOrEqual<K extends keyof T>(field: K & string, value: number | string): this {
    return this.where(field, '<=', value)
  }

  /**
   * Add complex AND conditions
   *
   * @example
   * ```typescript
   * .and([
   *   { field: 'status', operator: '==', value: 'published' },
   *   { field: 'featured', operator: '==', value: true }
   * ])
   * ```
   */
  and(conditions: FilterCondition[]): this {
    this.config.filter = this.config.filter || []
    this.config.filter.push({ and: conditions })
    return this
  }

  /**
   * Add complex OR conditions
   *
   * @example
   * ```typescript
   * .or([
   *   { field: 'status', operator: '==', value: 'published' },
   *   { field: 'status', operator: '==', value: 'featured' }
   * ])
   * ```
   */
  or(conditions: FilterCondition[]): this {
    this.config.filter = this.config.filter || []
    this.config.filter.push({ or: conditions })
    return this
  }

  /**
   * Add NOT condition
   *
   * @example
   * ```typescript
   * .not({ field: 'status', operator: '==', value: 'draft' })
   * ```
   */
  not(condition: FilterCondition): this {
    this.config.filter = this.config.filter || []
    this.config.filter.push({ not: condition })
    return this
  }

  // ==========================================================================
  // PROJECTION (Field Selection)
  // ==========================================================================

  /**
   * Select specific fields to return
   *
   * @example
   * ```typescript
   * .select('title', 'slug', 'publishedAt')
   * ```
   */
  select<K extends keyof T>(...fields: (K & string)[]): this {
    this.config.projection = fields.reduce((acc, field) => {
      acc[field] = true
      return acc
    }, {} as Projection<T>)
    return this
  }

  /**
   * Define a custom projection
   *
   * @example
   * ```typescript
   * .project({
   *   title: true,
   *   slug: true,
   *   author: {
   *     name: true,
   *     image: true
   *   }
   * })
   * ```
   */
  project(projection: Projection<T>): this {
    this.config.projection = projection
    return this
  }

  /**
   * Expand/resolve a reference field
   *
   * @example
   * ```typescript
   * .expand('author', { name: true, image: true })
   * ```
   */
  expand<K extends keyof T>(field: K & string, projection?: Projection<T[K]>): this {
    const expandedValue: ExpandedProjection<T[K]> = { _expand: true, projection }
    this.config.projection = this.config.projection || ({} as Projection<T>)
    // Use type assertion for the assignment since Projection<T> now includes ExpandedProjection
    ;(this.config.projection as Record<string, unknown>)[field] = expandedValue
    return this
  }

  // ==========================================================================
  // SORTING
  // ==========================================================================

  /**
   * Add sorting
   *
   * @example
   * ```typescript
   * .orderBy('publishedAt', 'desc')
   * .orderBy('title', 'asc')
   * ```
   */
  orderBy<K extends keyof T>(field: K & string, direction: 'asc' | 'desc' = 'asc'): this {
    this.config.orderBy = this.config.orderBy || []
    this.config.orderBy.push({ field, direction })
    return this
  }

  /**
   * Shorthand for ascending sort
   *
   * @example
   * ```typescript
   * .sortAsc('title')
   * ```
   */
  sortAsc<K extends keyof T>(field: K & string): this {
    return this.orderBy(field, 'asc')
  }

  /**
   * Shorthand for descending sort
   *
   * @example
   * ```typescript
   * .sortDesc('publishedAt')
   * ```
   */
  sortDesc<K extends keyof T>(field: K & string): this {
    return this.orderBy(field, 'desc')
  }

  // ==========================================================================
  // PAGINATION
  // ==========================================================================

  /**
   * Limit number of results
   *
   * @example
   * ```typescript
   * .limit(10)
   * ```
   */
  limit(count: number): this {
    this.config.limit = count
    return this
  }

  /**
   * Skip a number of results (offset pagination)
   *
   * @example
   * ```typescript
   * .offset(20)
   * ```
   */
  offset(count: number): this {
    this.config.offset = count
    return this
  }

  /**
   * Use cursor-based pagination
   *
   * @example
   * ```typescript
   * .cursor('eyJpZCI6InBvc3QtMTIzIn0=')
   * ```
   */
  cursor(cursor: string): this {
    this.config.cursor = cursor
    return this
  }

  /**
   * Set page and page size (convenience for offset/limit)
   *
   * @example
   * ```typescript
   * .page(2, 20)  // Skip 20, limit 20
   * ```
   */
  page(page: number, pageSize: number): this {
    this.config.offset = (page - 1) * pageSize
    this.config.limit = pageSize
    return this
  }

  // ==========================================================================
  // LOCALIZATION
  // ==========================================================================

  /**
   * Set locale for localized content
   *
   * @example
   * ```typescript
   * .locale('es')
   * .locale('fr', 'en')  // with fallback
   * ```
   */
  locale(locale: string, fallback?: string): this {
    this.config.locale = locale
    if (fallback) {
      this.config.fallbackLocale = fallback
    }
    return this
  }

  // ==========================================================================
  // CACHING
  // ==========================================================================

  /**
   * Configure caching
   *
   * @example
   * ```typescript
   * .cache({ tags: ['posts'], ttl: 3600 })
   * ```
   */
  cache(options: CacheOptions): this {
    this.config.cache = { ...this.config.cache, ...options }
    return this
  }

  /**
   * Add cache tags
   *
   * @example
   * ```typescript
   * .tags('posts', 'featured')
   * ```
   */
  tags(...tags: string[]): this {
    this.config.cache = this.config.cache || {}
    this.config.cache.tags = [...(this.config.cache.tags || []), ...tags]
    return this
  }

  /**
   * Set cache TTL in seconds
   *
   * @example
   * ```typescript
   * .ttl(3600)  // 1 hour
   * ```
   */
  ttl(seconds: number): this {
    this.config.cache = this.config.cache || {}
    this.config.cache.ttl = seconds
    return this
  }

  /**
   * Disable caching for this query
   *
   * @example
   * ```typescript
   * .noCache()
   * ```
   */
  noCache(): this {
    this.config.cache = { noCache: true }
    return this
  }

  /**
   * Set revalidation interval (for frameworks like Next.js)
   *
   * @example
   * ```typescript
   * .revalidate(60)  // Revalidate every 60 seconds
   * ```
   */
  revalidate(seconds: number | false): this {
    this.config.cache = this.config.cache || {}
    this.config.cache.revalidate = seconds
    return this
  }

  // ==========================================================================
  // PREVIEW/DRAFTS
  // ==========================================================================

  /**
   * Include draft/unpublished documents
   *
   * @example
   * ```typescript
   * .includeDrafts()
   * ```
   */
  includeDrafts(include = true): this {
    this.config.includeDrafts = include
    return this
  }

  // ==========================================================================
  // REFERENCES
  // ==========================================================================

  /**
   * Resolve references to specified depth
   *
   * @example
   * ```typescript
   * .resolveReferences(2)  // Resolve 2 levels deep
   * .resolveReferences()   // Resolve 1 level deep
   * ```
   */
  resolveReferences(depth: boolean | number = true): this {
    this.config.resolveReferences = depth
    return this
  }

  // ==========================================================================
  // EXECUTION
  // ==========================================================================

  /**
   * Execute query and return multiple results
   *
   * @example
   * ```typescript
   * const posts = await builder.getMany()
   * ```
   */
  async getMany(): Promise<QueryResult<T>> {
    return this.executor.executeMany(this.config)
  }

  /**
   * Execute query and return first result
   *
   * @example
   * ```typescript
   * const post = await builder.getOne()
   * ```
   */
  async getOne(): Promise<T | null> {
    const result = await this.executor.executeOne(this.config)
    return result.data
  }

  /**
   * Count matching documents
   *
   * @example
   * ```typescript
   * const count = await builder.count()
   * ```
   */
  async count(): Promise<number> {
    return this.executor.executeCount(this.config)
  }

  /**
   * Get the compiled query config (for debugging or custom execution)
   *
   * @example
   * ```typescript
   * const config = builder.toQuery()
   * console.log(config)
   * ```
   */
  toQuery(): QueryConfig<T> {
    return { ...this.config }
  }

  /**
   * Clone the builder with a new config
   * Useful for creating variations of a base query
   *
   * @example
   * ```typescript
   * const baseQuery = builder.where('status', '==', 'published')
   * const featuredQuery = baseQuery.clone().where('featured', '==', true)
   * ```
   */
  clone(): QueryBuilder<T> {
    // Use structuredClone for deep cloning (Node 17+ / modern browsers)
    // Falls back to JSON for older environments
    const clonedConfig = typeof structuredClone === 'function'
      ? structuredClone(this.config)
      : JSON.parse(JSON.stringify(this.config)) as QueryConfig<T>

    return new QueryBuilder<T>(
      clonedConfig.type,
      this.executor,
      clonedConfig
    )
  }
}

// ============================================================================
// Executor Interface
// ============================================================================

/**
 * Interface for executing queries
 * Implemented by ContentService adapters
 */
export interface QueryExecutor<T extends BaseDocument = BaseDocument> {
  /**
   * Execute query and return multiple results
   */
  executeMany(config: QueryConfig<T>): Promise<QueryResult<T>>

  /**
   * Execute query and return single result
   */
  executeOne(config: QueryConfig<T>): Promise<SingleResult<T>>

  /**
   * Execute count query
   */
  executeCount(config: QueryConfig): Promise<number>
}
