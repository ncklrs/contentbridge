/**
 * Contentful Query Compiler
 *
 * Compiles universal QueryConfig to Contentful Content Delivery API query parameters
 * Handles filters, field selection, sorting, pagination, and localization
 */

import type {
  QueryConfig,
  FilterCondition,
  FilterOperator,
  Projection,
  OrderBy,
} from '@contentbridge/core'

/**
 * Configuration for the Contentful query compiler
 */
export interface ContentfulCompilerConfig {
  /**
   * Default locale for queries
   * If not specified, Contentful returns the default locale
   */
  defaultLocale?: string

  /**
   * Whether to include all locales in results
   * @default false
   */
  includeAllLocales?: boolean

  /**
   * Default query limit
   * @default 100
   */
  defaultLimit?: number

  /**
   * Maximum depth for resolving linked entries/assets
   * @default 10
   */
  resolveDepth?: number
}

/**
 * Compiled Contentful query parameters
 * These map directly to Contentful's Content Delivery API query parameters
 */
export interface ContentfulQuery {
  /**
   * Content type to query
   */
  content_type?: string

  /**
   * Fields to select (comma-separated)
   */
  select?: string

  /**
   * Order by field(s) (comma-separated, prefix with - for desc)
   */
  order?: string

  /**
   * Number of results to skip (pagination)
   */
  skip?: number

  /**
   * Maximum number of results to return
   */
  limit?: number

  /**
   * Locale to query
   */
  locale?: string

  /**
   * Include entries from specific level (for linked entries)
   */
  include?: number

  /**
   * Dynamic filter parameters (fields.fieldName[operator]=value)
   */
  [key: string]: string | number | boolean | undefined
}

/**
 * Contentful Query Compiler
 * Converts universal QueryConfig to Contentful API parameters
 */
export class QueryCompiler {
  private config: Required<ContentfulCompilerConfig>

  constructor(config: ContentfulCompilerConfig = {}) {
    this.config = {
      defaultLocale: config.defaultLocale || 'en-US',
      includeAllLocales: config.includeAllLocales ?? false,
      defaultLimit: config.defaultLimit ?? 100,
      resolveDepth: config.resolveDepth ?? 10,
    }
  }

  /**
   * Compile a QueryConfig to Contentful query parameters
   */
  compile(query: QueryConfig): ContentfulQuery {
    const params: ContentfulQuery = {}

    // Content type
    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type]
      if (types.length === 1) {
        params.content_type = types[0]
      } else {
        // Contentful doesn't support multiple content types in one query
        // Caller will need to make separate queries and merge results
        // For now, use the first type
        params.content_type = types[0]
        console.warn('Contentful does not support querying multiple content types at once. Using first type:', types[0])
      }
    }

    // Locale
    if (query.locale) {
      params.locale = query.locale
    } else if (this.config.includeAllLocales) {
      params.locale = '*'
    } else if (this.config.defaultLocale) {
      params.locale = this.config.defaultLocale
    }

    // Projection (field selection)
    if (query.projection) {
      params.select = this.compileProjection(query.projection)
    }

    // Filters
    if (query.filter && query.filter.length > 0) {
      const filterParams = this.compileFilters(query.filter)
      Object.assign(params, filterParams)
    }

    // Sorting
    if (query.orderBy && query.orderBy.length > 0) {
      params.order = this.compileOrderBy(query.orderBy)
    }

    // Pagination
    if (query.offset !== undefined) {
      params.skip = query.offset
    }

    if (query.limit !== undefined) {
      params.limit = query.limit
    } else {
      params.limit = this.config.defaultLimit
    }

    // Reference resolution depth
    if (query.resolveReferences) {
      const depth = typeof query.resolveReferences === 'number'
        ? query.resolveReferences
        : 1
      params.include = Math.min(depth, this.config.resolveDepth)
    }

    return params
  }

  /**
   * Compile projection to Contentful select parameter
   * Format: "sys,fields.title,fields.slug"
   */
  private compileProjection(projection: Projection<unknown>): string {
    const fields: string[] = []

    // Always include sys fields for metadata
    fields.push('sys')

    for (const [key, value] of Object.entries(projection)) {
      if (value === true) {
        // Simple field inclusion
        fields.push(`fields.${key}`)
      } else if (typeof value === 'object' && value !== null) {
        // Nested projection or expansion
        if ('_expand' in value) {
          // Reference expansion - include the field and let Contentful resolve it
          fields.push(`fields.${key}`)
        } else {
          // Nested object - include the parent field
          // Contentful doesn't support partial nested selection via select parameter
          fields.push(`fields.${key}`)
        }
      }
    }

    return fields.join(',')
  }

  /**
   * Compile filter conditions to Contentful query parameters
   */
  private compileFilters(conditions: FilterCondition[]): Record<string, string | number | boolean> {
    const params: Record<string, string | number | boolean> = {}

    for (const condition of conditions) {
      const filterParams = this.compileFilterCondition(condition)
      Object.assign(params, filterParams)
    }

    return params
  }

  /**
   * Compile a single filter condition
   */
  private compileFilterCondition(condition: FilterCondition): Record<string, string | number | boolean> {
    const params: Record<string, string | number | boolean> = {}

    // Handle logical operators
    if (condition.and) {
      // Contentful doesn't have explicit AND - multiple params are ANDed by default
      for (const subCondition of condition.and) {
        Object.assign(params, this.compileFilterCondition(subCondition))
      }
      return params
    }

    if (condition.or) {
      // Contentful supports OR for the same field using [in] operator
      // For different fields, we'd need multiple queries
      console.warn('OR conditions across different fields require multiple queries in Contentful')
      // Compile first condition for now
      if (condition.or.length > 0) {
        Object.assign(params, this.compileFilterCondition(condition.or[0]))
      }
      return params
    }

    if (condition.not) {
      // Contentful supports [ne] for not equals
      const subCondition = condition.not
      if (subCondition.field && subCondition.operator === '==') {
        const paramKey = this.buildFilterKey(subCondition.field, '!=')
        params[paramKey] = this.formatFilterValue(subCondition.value)
        return params
      }
      console.warn('Complex NOT conditions may require client-side filtering')
      return params
    }

    // Handle field comparison
    if (!condition.field || !condition.operator) {
      return params
    }

    const paramKey = this.buildFilterKey(condition.field, condition.operator)
    const value = this.formatFilterValue(condition.value)

    if (paramKey && value !== undefined) {
      params[paramKey] = value
    }

    return params
  }

  /**
   * Build Contentful filter key from field and operator
   * Format: fields.fieldName[operator]
   */
  private buildFilterKey(field: string, operator: FilterOperator): string {
    const operatorMap: Record<FilterOperator, string | null> = {
      '==': '', // No operator suffix for equality
      '!=': '[ne]',
      '>': '[gt]',
      '>=': '[gte]',
      '<': '[lt]',
      '<=': '[lte]',
      'in': '[in]',
      'nin': '[nin]',
      'contains': '[all]', // For array fields containing value
      'containsAny': '[in]', // Array contains any
      'containsAll': '[all]', // Array contains all
      'match': '[match]', // Full-text search
      'startsWith': '[match]', // Will append * in value
      'endsWith': '[match]', // Will prepend * in value
      'defined': '[exists]',
      'undefined': '[exists]',
      'references': null, // Not directly supported, need links_to_entry
    }

    const suffix = operatorMap[operator]

    if (suffix === null) {
      console.warn(`Operator '${operator}' not supported in Contentful query compiler`)
      return ''
    }

    // Special case for sys fields (like sys.id)
    if (field.startsWith('_id')) {
      return `sys.id${suffix}`
    }
    if (field.startsWith('_type')) {
      return `sys.contentType.sys.id${suffix}`
    }
    if (field.startsWith('_createdAt')) {
      return `sys.createdAt${suffix}`
    }
    if (field.startsWith('_updatedAt')) {
      return `sys.updatedAt${suffix}`
    }

    // Regular fields
    return `fields.${field}${suffix}`
  }

  /**
   * Format filter value for Contentful
   */
  private formatFilterValue(value: unknown): string | number | boolean {
    if (value === null || value === undefined) {
      return 'null'
    }

    if (typeof value === 'boolean') {
      return value
    }

    if (typeof value === 'number') {
      return value
    }

    if (Array.isArray(value)) {
      // Join array values with comma
      return value.map(v => String(v)).join(',')
    }

    if (typeof value === 'object') {
      // Stringify objects
      return JSON.stringify(value)
    }

    return String(value)
  }

  /**
   * Compile order by clauses to Contentful order parameter
   * Format: "fields.date,-fields.title" (- prefix for descending)
   */
  private compileOrderBy(orderBy: OrderBy[]): string {
    return orderBy
      .map(order => {
        const prefix = order.direction === 'desc' ? '-' : ''

        // Handle sys fields
        if (order.field.startsWith('_createdAt')) {
          return `${prefix}sys.createdAt`
        }
        if (order.field.startsWith('_updatedAt')) {
          return `${prefix}sys.updatedAt`
        }

        return `${prefix}fields.${order.field}`
      })
      .join(',')
  }

  /**
   * Build a query for a specific entry by ID
   */
  buildGetByIdQuery(id: string, options?: {
    locale?: string
    include?: number
  }): ContentfulQuery {
    const params: ContentfulQuery = {
      'sys.id': id,
    }

    if (options?.locale) {
      params.locale = options.locale
    } else if (this.config.defaultLocale) {
      params.locale = this.config.defaultLocale
    }

    if (options?.include !== undefined) {
      params.include = options.include
    }

    return params
  }

  /**
   * Build a query for entries by content type
   */
  buildGetByTypeQuery(contentType: string, options?: {
    locale?: string
    limit?: number
    skip?: number
  }): ContentfulQuery {
    const params: ContentfulQuery = {
      content_type: contentType,
    }

    if (options?.locale) {
      params.locale = options.locale
    } else if (this.config.defaultLocale) {
      params.locale = this.config.defaultLocale
    }

    if (options?.limit !== undefined) {
      params.limit = options.limit
    } else {
      params.limit = this.config.defaultLimit
    }

    if (options?.skip !== undefined) {
      params.skip = options.skip
    }

    return params
  }

  /**
   * Build a links_to_entry query for finding entries that reference a specific entry
   */
  buildLinksToQuery(entryId: string, field?: string): ContentfulQuery {
    const params: ContentfulQuery = {}

    if (field) {
      params[`fields.${field}.sys.id`] = entryId
    } else {
      params['links_to_entry'] = entryId
    }

    if (this.config.defaultLocale) {
      params.locale = this.config.defaultLocale
    }

    return params
  }
}

/**
 * Create a Contentful query compiler with config
 */
export function createContentfulCompiler(config?: ContentfulCompilerConfig): QueryCompiler {
  return new QueryCompiler(config)
}
