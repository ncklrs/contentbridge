/**
 * Query types - CMS-agnostic query configuration
 *
 * These types define how queries are constructed and executed,
 * abstracting away CMS-specific query languages (GROQ, GraphQL, REST filters).
 */

// ============================================================================
// Query Configuration
// ============================================================================

/**
 * Complete query configuration object
 * Adapters compile this to their native query format
 */
export interface QueryConfig<T = unknown> {
  /** Document type(s) to query */
  type: string | string[]

  /** Filter conditions */
  filter?: FilterCondition[]

  /** Field projection (what to return) */
  projection?: Projection<T>

  /** Sorting configuration */
  orderBy?: OrderBy[]

  /** Maximum results to return */
  limit?: number

  /** Number of results to skip (for pagination) */
  offset?: number

  /** Cursor for cursor-based pagination */
  cursor?: string

  /** Language/locale for i18n content */
  locale?: string

  /** Fallback locale if primary not found */
  fallbackLocale?: string

  /** Include draft/unpublished documents */
  includeDrafts?: boolean

  /** How deep to resolve references (true = 1 level, number = specific depth) */
  resolveReferences?: boolean | number

  /** Caching configuration */
  cache?: CacheOptions

  /** Additional CMS-specific parameters */
  params?: Record<string, unknown>
}

// ============================================================================
// Filtering
// ============================================================================

/**
 * A single filter condition
 *
 * @example
 * ```typescript
 * // Simple equality
 * { field: 'status', operator: '==', value: 'published' }
 *
 * // Array containment
 * { field: 'tags', operator: 'contains', value: 'featured' }
 *
 * // Nested AND conditions
 * {
 *   and: [
 *     { field: 'status', operator: '==', value: 'published' },
 *     { field: 'featured', operator: '==', value: true }
 *   ]
 * }
 * ```
 */
export interface FilterCondition {
  /** Field path (supports dot notation for nested fields) */
  field?: string
  /** Comparison operator */
  operator?: FilterOperator
  /** Value to compare against */
  value?: unknown
  /** Nested AND conditions */
  and?: FilterCondition[]
  /** Nested OR conditions */
  or?: FilterCondition[]
  /** NOT condition */
  not?: FilterCondition
}

/**
 * Available filter operators
 * Adapters map these to their native equivalents
 */
export type FilterOperator =
  // Equality
  | '=='
  | '!='
  // Comparison
  | '>'
  | '>='
  | '<'
  | '<='
  // Array operations
  | 'in'           // Field value is in provided array
  | 'nin'          // Field value is NOT in provided array
  | 'contains'     // Array field contains value
  | 'containsAny'  // Array field contains any of values
  | 'containsAll'  // Array field contains all values
  // String operations
  | 'match'        // Full-text match
  | 'startsWith'
  | 'endsWith'
  // Existence
  | 'defined'      // Field exists and is not null
  | 'undefined'    // Field does not exist or is null
  // References
  | 'references'   // Document references another document

/**
 * Type-safe filter builder result
 */
export type TypedFilterCondition<T> = FilterCondition & {
  field: keyof T & string
}

// ============================================================================
// Projection (Field Selection)
// ============================================================================

/**
 * Computed/function projection
 * Allows for computed fields in the projection
 */
export interface ProjectionFunction {
  _fn: string
  args?: unknown[]
}

/**
 * Expand a reference field with a projection
 */
export interface ExpandedProjection<T = unknown> {
  _expand: true
  projection?: Projection<T>
}

/**
 * Defines which fields to return
 *
 * @example
 * ```typescript
 * // Simple field selection
 * { title: true, slug: true, author: true }
 *
 * // Nested projection
 * {
 *   title: true,
 *   author: {
 *     name: true,
 *     image: true
 *   }
 * }
 *
 * // Computed fields
 * {
 *   title: true,
 *   excerpt: { _fn: 'substring', args: ['body', 0, 200] }
 * }
 *
 * // Expanded reference
 * {
 *   title: true,
 *   author: { _expand: true, projection: { name: true, image: true } }
 * }
 * ```
 */
export type Projection<T> = {
  [K in keyof T]?:
    | boolean
    | Projection<T[K]>
    | ProjectionFunction
    | ExpandedProjection<T[K]>
    | string  // Alias: 'newName' or path expression
}

// ============================================================================
// Sorting
// ============================================================================

/**
 * Sort configuration
 */
export interface OrderBy {
  /** Field to sort by */
  field: string
  /** Sort direction */
  direction: 'asc' | 'desc'
}

/**
 * Type-safe order by
 */
export type TypedOrderBy<T> = OrderBy & {
  field: keyof T & string
}

// ============================================================================
// Caching
// ============================================================================

/**
 * Cache configuration for queries
 * Adapters may implement these differently based on framework
 */
export interface CacheOptions {
  /** Cache tags for granular invalidation */
  tags?: string[]

  /** Time-to-live in seconds */
  ttl?: number

  /** Custom cache key (overrides auto-generated) */
  key?: string

  /** Force skip cache (for preview/draft mode) */
  noCache?: boolean

  /** Revalidate strategy for frameworks like Next.js */
  revalidate?: number | false

  /** Framework-specific cache options */
  frameworkOptions?: Record<string, unknown>
}

// ============================================================================
// Query Results
// ============================================================================

/**
 * Standard query result wrapper
 */
export interface QueryResult<T> {
  /** Retrieved documents */
  data: T[]

  /** Total count (if available) */
  total?: number

  /** Whether more results exist */
  hasMore?: boolean

  /** Cursor for next page */
  nextCursor?: string

  /** Query execution time in ms */
  timing?: number

  /** Cache status */
  cacheStatus?: 'hit' | 'miss' | 'stale' | 'bypass'
}

/**
 * Single document result
 */
export interface SingleResult<T> {
  data: T | null
  timing?: number
  cacheStatus?: 'hit' | 'miss' | 'stale' | 'bypass'
}

// ============================================================================
// Pagination Helpers
// ============================================================================

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  /** Page number (1-based) */
  page?: number
  /** Items per page */
  pageSize?: number
  /** Cursor for cursor-based pagination */
  cursor?: string
}

/**
 * Convert page-based pagination to offset/limit
 */
export function paginationToOffset(config: PaginationConfig): { offset: number; limit: number } {
  const page = config.page ?? 1
  const pageSize = config.pageSize ?? 20
  return {
    offset: (page - 1) * pageSize,
    limit: pageSize,
  }
}

/**
 * Create pagination info from results
 */
export function createPaginationInfo<T>(
  result: QueryResult<T>,
  config: PaginationConfig
): PaginationInfo {
  const page = config.page ?? 1
  const pageSize = config.pageSize ?? 20
  const total = result.total ?? result.data.length
  const totalPages = Math.ceil(total / pageSize)

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}

export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}
