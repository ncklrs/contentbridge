/**
 * Strapi Query Compiler
 *
 * Compiles universal QueryConfig to Strapi REST API parameters
 * Handles filters, projections, sorting, pagination, and population (reference resolution)
 *
 * Strapi v4/v5 REST API uses:
 * - filters[field][$operator]=value for filtering
 * - sort=field:asc for sorting
 * - pagination[page]=1&pagination[pageSize]=25 for pagination
 * - populate=* or populate[relation]=true for reference resolution
 */

import type {
  QueryConfig,
  FilterCondition,
  FilterOperator,
  Projection,
  OrderBy,
} from '@contentbridge/core'

/**
 * Configuration for the Strapi query compiler
 */
export interface QueryCompilerConfig {
  /**
   * Default locale for localized content
   */
  defaultLocale?: string

  /**
   * Fallback locales in order of preference
   */
  fallbackLocales?: string[]

  /**
   * Default page size for pagination
   * @default 25
   */
  defaultPageSize?: number

  /**
   * Maximum page size allowed
   * @default 100
   */
  maxPageSize?: number

  /**
   * Whether to include draft content
   * @default false
   */
  includeDrafts?: boolean
}

/**
 * Compiled Strapi query result
 */
export interface CompiledStrapiQuery {
  /**
   * The API endpoint path (e.g., '/api/posts')
   */
  endpoint: string

  /**
   * Query parameters as URLSearchParams
   */
  params: URLSearchParams

  /**
   * Query parameters as plain object (for debugging/logging)
   */
  paramsObject: Record<string, unknown>
}

/**
 * Strapi Query Compiler
 * Converts universal QueryConfig to Strapi REST API format
 */
export class QueryCompiler {
  private config: Required<QueryCompilerConfig>

  constructor(config: QueryCompilerConfig = {}) {
    this.config = {
      defaultLocale: config.defaultLocale || 'en',
      fallbackLocales: config.fallbackLocales || [],
      defaultPageSize: config.defaultPageSize || 25,
      maxPageSize: config.maxPageSize || 100,
      includeDrafts: config.includeDrafts ?? false,
    }
  }

  /**
   * Compile a QueryConfig to Strapi REST API parameters
   */
  compile(query: QueryConfig): CompiledStrapiQuery {
    const params: Record<string, unknown> = {}

    // Compile filters
    const filters = this.compileFilters(query)
    if (Object.keys(filters).length > 0) {
      params.filters = filters
    }

    // Compile projection (fields)
    const fields = this.compileProjection(query)
    if (fields) {
      params.fields = fields
    }

    // Compile population (reference resolution)
    const populate = this.compilePopulate(query)
    if (populate) {
      params.populate = populate
    }

    // Compile sorting
    const sort = this.compileSort(query)
    if (sort.length > 0) {
      params.sort = sort
    }

    // Compile pagination
    const pagination = this.compilePagination(query)
    if (Object.keys(pagination).length > 0) {
      params.pagination = pagination
    }

    // Compile locale
    const locale = this.compileLocale(query)
    if (locale) {
      params.locale = locale
    }

    // Include drafts if configured
    if (this.config.includeDrafts) {
      params.publicationState = 'preview'
    }

    // Build endpoint
    const type = Array.isArray(query.type) ? query.type[0] : query.type
    const endpoint = `/api/${this.pluralizeApiId(type)}`

    // Convert to URLSearchParams
    const urlParams = this.toURLSearchParams(params)

    return {
      endpoint,
      params: urlParams,
      paramsObject: params,
    }
  }

  /**
   * Compile filters to Strapi format
   */
  private compileFilters(query: QueryConfig): Record<string, unknown> {
    const filters: Record<string, unknown> = {}

    // Handle type filtering (for multi-type queries)
    if (Array.isArray(query.type) && query.type.length > 1) {
      // Strapi doesn't support multi-type queries directly
      // This would need to be handled at a higher level with multiple requests
      console.warn('Multi-type queries not supported in Strapi. Using first type:', query.type[0])
    }

    // Compile custom filters
    if (query.filter && query.filter.length > 0) {
      for (const condition of query.filter) {
        Object.assign(filters, this.compileFilterCondition(condition))
      }
    }

    return filters
  }

  /**
   * Compile a single filter condition to Strapi format
   */
  private compileFilterCondition(condition: FilterCondition): Record<string, unknown> {
    // Handle logical operators
    if (condition.and) {
      return {
        $and: condition.and.map(c => this.compileFilterCondition(c)),
      }
    }

    if (condition.or) {
      return {
        $or: condition.or.map(c => this.compileFilterCondition(c)),
      }
    }

    if (condition.not) {
      return {
        $not: this.compileFilterCondition(condition.not),
      }
    }

    // Handle field comparison
    if (!condition.field || !condition.operator) {
      return {}
    }

    const field = condition.field
    const operator = condition.operator
    const value = condition.value

    return {
      [field]: this.compileStrapiOperator(operator, value),
    }
  }

  /**
   * Compile a filter operator to Strapi format
   */
  private compileStrapiOperator(
    operator: FilterOperator,
    value: unknown
  ): Record<string, unknown> | unknown {
    switch (operator) {
      case '==':
        // Direct equality (no operator needed)
        return { $eq: value }

      case '!=':
        return { $ne: value }

      case '>':
        return { $gt: value }

      case '>=':
        return { $gte: value }

      case '<':
        return { $lt: value }

      case '<=':
        return { $lte: value }

      case 'in':
        return { $in: value }

      case 'nin':
        return { $notIn: value }

      case 'contains':
        // For arrays: check if array contains value
        return { $contains: value }

      case 'containsAny':
        // For arrays: check if array contains any of values
        return { $containsi: value }

      case 'containsAll':
        // Strapi doesn't have a direct $containsAll operator
        // We need to use $and with multiple $contains
        if (Array.isArray(value)) {
          return {
            $and: value.map(v => ({ $contains: v })),
          }
        }
        return { $contains: value }

      case 'match':
        // Full-text search (case-insensitive contains)
        return { $containsi: value }

      case 'startsWith':
        return { $startsWith: value }

      case 'endsWith':
        return { $endsWith: value }

      case 'defined':
        // Field is not null
        return { $notNull: true }

      case 'undefined':
        // Field is null
        return { $null: true }

      case 'references':
        // For relation fields: check if it references a specific document
        // In Strapi, this is typically done with the relation field's id
        return { id: value }

      default:
        console.warn(`Unknown filter operator: ${operator}`)
        return { $eq: value }
    }
  }

  /**
   * Compile projection to Strapi fields array
   */
  private compileProjection(query: QueryConfig): string[] | null {
    if (!query.projection) {
      return null
    }

    const fields: string[] = []

    for (const [key, value] of Object.entries(query.projection)) {
      if (value === true) {
        fields.push(key)
      } else if (typeof value === 'string') {
        // Alias - use the alias as field name
        fields.push(value)
      }
      // Note: Nested projections are handled via populate
    }

    return fields.length > 0 ? fields : null
  }

  /**
   * Compile population (reference resolution) configuration
   */
  private compilePopulate(query: QueryConfig): unknown {
    const resolveDepth = query.resolveReferences

    if (!resolveDepth) {
      return null
    }

    if (resolveDepth === true || resolveDepth === 1) {
      // Populate all relations at level 1
      return '*'
    }

    if (typeof resolveDepth === 'number' && resolveDepth > 1) {
      // Deep population requires explicit field mapping
      // For now, we'll use the default deep populate pattern
      return {
        populate: '*',
      }
    }

    // Handle projection-based population
    if (query.projection) {
      return this.compilePopulateFromProjection(query.projection)
    }

    return null
  }

  /**
   * Compile populate configuration from projection
   */
  private compilePopulateFromProjection(
    projection: Projection<unknown>
  ): Record<string, unknown> | null {
    const populate: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(projection)) {
      if (typeof value === 'object' && value !== null) {
        if ('_expand' in value) {
          // Explicit expansion
          const expand = value as { _expand: boolean; projection?: Projection<unknown> }
          if (expand.projection) {
            populate[key] = {
              fields: Object.keys(expand.projection),
            }
          } else {
            populate[key] = true
          }
        } else if (!('_fn' in value)) {
          // Nested object projection - treat as relation
          populate[key] = {
            fields: Object.keys(value),
          }
        }
      }
    }

    return Object.keys(populate).length > 0 ? populate : null
  }

  /**
   * Compile sorting to Strapi format
   */
  private compileSort(query: QueryConfig): string[] {
    if (!query.orderBy || query.orderBy.length === 0) {
      return []
    }

    return query.orderBy.map((order: OrderBy) => {
      const direction = order.direction === 'desc' ? 'desc' : 'asc'
      return `${order.field}:${direction}`
    })
  }

  /**
   * Compile pagination to Strapi format
   */
  private compilePagination(query: QueryConfig): Record<string, unknown> {
    const pagination: Record<string, unknown> = {}

    if (query.limit !== undefined) {
      const pageSize = Math.min(query.limit, this.config.maxPageSize)
      pagination.pageSize = pageSize

      // Calculate page number from offset
      if (query.offset !== undefined) {
        const page = Math.floor(query.offset / pageSize) + 1
        pagination.page = page
      } else {
        pagination.page = 1
      }
    } else {
      // Use default page size
      pagination.pageSize = this.config.defaultPageSize

      if (query.offset !== undefined) {
        const page = Math.floor(query.offset / this.config.defaultPageSize) + 1
        pagination.page = page
      }
    }

    // Handle cursor-based pagination (Strapi doesn't support natively)
    if (query.cursor) {
      console.warn('Cursor-based pagination not natively supported in Strapi')
      // Could be implemented by storing cursor as page number
    }

    return pagination
  }

  /**
   * Compile locale configuration
   */
  private compileLocale(query: QueryConfig): string | null {
    if (query.locale) {
      return query.locale
    }

    if (this.config.defaultLocale) {
      return this.config.defaultLocale
    }

    return null
  }

  /**
   * Convert parameters object to URLSearchParams
   * Handles nested objects using bracket notation
   */
  private toURLSearchParams(params: Record<string, unknown>): URLSearchParams {
    const searchParams = new URLSearchParams()

    const addParam = (key: string, value: unknown): void => {
      if (value === null || value === undefined) {
        return
      }

      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            Object.entries(item).forEach(([k, v]) => {
              addParam(`${key}[${index}][${k}]`, v)
            })
          } else {
            addParam(`${key}[${index}]`, item)
          }
        })
      } else if (typeof value === 'object') {
        Object.entries(value).forEach(([k, v]) => {
          addParam(`${key}[${k}]`, v)
        })
      } else {
        searchParams.append(key, String(value))
      }
    }

    Object.entries(params).forEach(([key, value]) => {
      addParam(key, value)
    })

    return searchParams
  }

  /**
   * Convert a document type to its plural API ID
   * In Strapi, collections are typically pluralized
   */
  private pluralizeApiId(type: string): string {
    // Simple pluralization - in production, this should use a proper
    // pluralization library or configuration mapping
    if (type.endsWith('s')) {
      return type
    }
    if (type.endsWith('y')) {
      return type.slice(0, -1) + 'ies'
    }
    return type + 's'
  }

  /**
   * Build a complete URL with params
   */
  buildUrl(baseUrl: string, query: QueryConfig): string {
    const compiled = this.compile(query)
    const url = new URL(compiled.endpoint, baseUrl)
    url.search = compiled.params.toString()
    return url.toString()
  }
}

/**
 * Create a Strapi query compiler with config
 */
export function createQueryCompiler(config?: QueryCompilerConfig): QueryCompiler {
  return new QueryCompiler(config)
}
