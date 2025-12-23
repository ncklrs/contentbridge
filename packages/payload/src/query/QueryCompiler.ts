/**
 * Payload Query Compiler
 *
 * Compiles universal QueryConfig to Payload's where/sort/limit format
 * Supports both REST API and Local API query structures
 */

import type {
  QueryConfig,
  FilterCondition,
  FilterOperator,
  OrderBy,
} from '@contentbridge/core'

/**
 * Configuration for the Payload query compiler
 */
export interface PayloadQueryConfig {
  /**
   * Default locale for localized fields
   */
  defaultLocale?: string

  /**
   * Fallback locales in order of preference
   */
  fallbackLocales?: string[]

  /**
   * Whether to include draft documents
   * @default false
   */
  includeDrafts?: boolean

  /**
   * Global filter to append to all queries
   */
  globalFilter?: Record<string, unknown>
}

/**
 * Compiled Payload query result
 * Compatible with both REST API and Local API
 */
export interface CompiledPayloadQuery {
  /**
   * Collection name(s) to query
   */
  collection: string | string[]

  /**
   * WHERE clause object for filtering
   */
  where?: Record<string, unknown>

  /**
   * Sort configuration
   */
  sort?: string

  /**
   * Maximum results to return
   */
  limit?: number

  /**
   * Results to skip (for pagination)
   */
  page?: number

  /**
   * Locale for localized content
   */
  locale?: string

  /**
   * Fallback locale
   */
  fallbackLocale?: string

  /**
   * Depth for populating relationships
   */
  depth?: number

  /**
   * Whether to include drafts
   */
  draft?: boolean
}

/**
 * Payload Query Compiler
 * Converts universal QueryConfig to Payload's query format
 */
export class QueryCompiler {
  private config: PayloadQueryConfig

  constructor(config: PayloadQueryConfig = {}) {
    this.config = config
  }

  /**
   * Compile a QueryConfig to Payload query parameters
   */
  compile(query: QueryConfig): CompiledPayloadQuery {
    const result: CompiledPayloadQuery = {
      collection: this.compileCollection(query),
    }

    // Build WHERE clause
    const where = this.compileWhere(query)
    if (where && Object.keys(where).length > 0) {
      result.where = where
    }

    // Build SORT
    const sort = this.compileSort(query)
    if (sort) {
      result.sort = sort
    }

    // Pagination
    if (query.limit !== undefined) {
      result.limit = query.limit
    }

    if (query.offset !== undefined) {
      // Payload uses page-based pagination (1-indexed)
      // Convert offset to page number
      const pageSize = query.limit || 10
      result.page = Math.floor(query.offset / pageSize) + 1
    }

    // Localization
    if (query.locale) {
      result.locale = query.locale
    }

    if (query.fallbackLocale) {
      result.fallbackLocale = query.fallbackLocale
    }

    // Reference resolution depth
    if (query.resolveReferences) {
      result.depth = typeof query.resolveReferences === 'number'
        ? query.resolveReferences
        : 1
    }

    // Drafts
    if (query.includeDrafts !== undefined) {
      result.draft = query.includeDrafts
    } else if (this.config.includeDrafts !== undefined) {
      result.draft = this.config.includeDrafts
    }

    return result
  }

  /**
   * Extract collection name from query type
   */
  private compileCollection(query: QueryConfig): string | string[] {
    if (!query.type) {
      throw new Error('Query type (collection) is required')
    }

    return query.type
  }

  /**
   * Compile WHERE clause
   * Payload uses nested object structure with operators
   */
  private compileWhere(query: QueryConfig): Record<string, unknown> | undefined {
    const conditions: Record<string, unknown>[] = []

    // Add filter conditions
    if (query.filter && query.filter.length > 0) {
      const compiledFilters = query.filter
        .map(f => this.compileFilterCondition(f))
        .filter(Boolean) as Record<string, unknown>[]

      if (compiledFilters.length > 0) {
        conditions.push(...compiledFilters)
      }
    }

    // Add global filter from config
    if (this.config.globalFilter) {
      conditions.push(this.config.globalFilter)
    }

    // Combine conditions with AND
    if (conditions.length === 0) {
      return undefined
    }

    if (conditions.length === 1) {
      return conditions[0]
    }

    // Multiple conditions - use AND operator
    return {
      and: conditions,
    }
  }

  /**
   * Compile a single filter condition to Payload where clause
   */
  private compileFilterCondition(
    condition: FilterCondition
  ): Record<string, unknown> | null {
    // Handle logical operators
    if (condition.and) {
      const compiled = condition.and
        .map(c => this.compileFilterCondition(c))
        .filter(Boolean) as Record<string, unknown>[]

      return compiled.length > 0 ? { and: compiled } : null
    }

    if (condition.or) {
      const compiled = condition.or
        .map(c => this.compileFilterCondition(c))
        .filter(Boolean) as Record<string, unknown>[]

      return compiled.length > 0 ? { or: compiled } : null
    }

    if (condition.not) {
      const compiled = this.compileFilterCondition(condition.not)
      return compiled ? { not: compiled } : null
    }

    // Handle field comparison
    if (!condition.field || !condition.operator) {
      return null
    }

    return this.compileOperator(condition.field, condition.operator, condition.value)
  }

  /**
   * Compile a filter operator to Payload where clause
   *
   * Payload operators:
   * - equals, not_equals
   * - in, not_in, all
   * - exists
   * - greater_than, greater_than_equal, less_than, less_than_equal
   * - like, contains
   * - near (for geo queries)
   */
  private compileOperator(
    field: string,
    operator: FilterOperator,
    value: unknown
  ): Record<string, unknown> {
    switch (operator) {
      case '==':
        return { [field]: { equals: value } }

      case '!=':
        return { [field]: { not_equals: value } }

      case '>':
        return { [field]: { greater_than: value } }

      case '>=':
        return { [field]: { greater_than_equal: value } }

      case '<':
        return { [field]: { less_than: value } }

      case '<=':
        return { [field]: { less_than_equal: value } }

      case 'in':
        return { [field]: { in: value } }

      case 'nin':
        return { [field]: { not_in: value } }

      case 'contains':
        // For arrays: check if field contains value
        // For strings: use like operator
        if (typeof value === 'string') {
          return { [field]: { contains: value } }
        }
        return { [field]: { in: [value] } }

      case 'containsAny':
        // Array contains any of the provided values
        if (Array.isArray(value)) {
          return {
            or: value.map(v => ({ [field]: { in: [v] } })),
          }
        }
        return { [field]: { in: [value] } }

      case 'containsAll':
        // Array contains all of the provided values
        if (Array.isArray(value)) {
          return { [field]: { all: value } }
        }
        return { [field]: { all: [value] } }

      case 'match':
        // Full-text search using like operator
        return { [field]: { like: value } }

      case 'startsWith':
        // String starts with - use like with wildcard
        return { [field]: { like: `${value}%` } }

      case 'endsWith':
        // String ends with - use like with wildcard
        return { [field]: { like: `%${value}` } }

      case 'defined':
        // Field exists and is not null
        return { [field]: { exists: true } }

      case 'undefined':
        // Field does not exist or is null
        return { [field]: { exists: false } }

      case 'references':
        // Document references another
        // In Payload, this is typically a relationship field
        return { [field]: { equals: value } }

      default:
        console.warn(`Unknown filter operator: ${operator}`)
        return {}
    }
  }

  /**
   * Compile sort configuration to Payload sort string
   * Payload format: "-field" for desc, "field" for asc
   * Multiple sorts: "field1,-field2"
   */
  private compileSort(query: QueryConfig): string | undefined {
    if (!query.orderBy || query.orderBy.length === 0) {
      return undefined
    }

    const sortFields = query.orderBy.map((order: OrderBy) => {
      const prefix = order.direction === 'desc' ? '-' : ''
      return `${prefix}${order.field}`
    })

    return sortFields.join(',')
  }

  /**
   * Convert compiled query to REST API URL parameters
   */
  toRESTParams(compiled: CompiledPayloadQuery): Record<string, string> {
    const params: Record<string, string> = {}

    if (compiled.where) {
      params.where = JSON.stringify(compiled.where)
    }

    if (compiled.sort) {
      params.sort = compiled.sort
    }

    if (compiled.limit !== undefined) {
      params.limit = String(compiled.limit)
    }

    if (compiled.page !== undefined) {
      params.page = String(compiled.page)
    }

    if (compiled.locale) {
      params.locale = compiled.locale
    }

    if (compiled.fallbackLocale) {
      params.fallbackLocale = compiled.fallbackLocale
    }

    if (compiled.depth !== undefined) {
      params.depth = String(compiled.depth)
    }

    if (compiled.draft !== undefined) {
      params.draft = String(compiled.draft)
    }

    return params
  }

  /**
   * Convert compiled query to Local API options
   */
  toLocalAPIOptions(compiled: CompiledPayloadQuery): Record<string, unknown> {
    const options: Record<string, unknown> = {}

    if (compiled.where) {
      options.where = compiled.where
    }

    if (compiled.sort) {
      options.sort = compiled.sort
    }

    if (compiled.limit !== undefined) {
      options.limit = compiled.limit
    }

    if (compiled.page !== undefined) {
      options.page = compiled.page
    }

    if (compiled.locale) {
      options.locale = compiled.locale
    }

    if (compiled.fallbackLocale) {
      options.fallbackLocale = compiled.fallbackLocale
    }

    if (compiled.depth !== undefined) {
      options.depth = compiled.depth
    }

    if (compiled.draft !== undefined) {
      options.draft = compiled.draft
    }

    return options
  }
}

/**
 * Create a Payload query compiler with config
 */
export function createQueryCompiler(config?: PayloadQueryConfig): QueryCompiler {
  return new QueryCompiler(config)
}
