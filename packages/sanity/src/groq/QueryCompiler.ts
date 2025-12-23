/**
 * GROQ Query Compiler
 *
 * Compiles universal QueryConfig to Sanity GROQ query strings
 * Handles filters, projections, sorting, pagination, and localization
 */

import type {
  QueryConfig,
  FilterCondition,
  FilterOperator,
  Projection,
  OrderBy,
} from '@contentbridge/core'

/**
 * Configuration for the GROQ compiler
 */
export interface GROQCompilerConfig {
  /**
   * Default locale for localized fields
   * Used in coalesce patterns: coalesce(field.en, field.de)
   */
  defaultLocale?: string

  /**
   * Fallback locales in order of preference
   */
  fallbackLocales?: string[]

  /**
   * Whether to use draft documents (drafts prefix)
   */
  includeDrafts?: boolean

  /**
   * Custom filter expression to append (e.g., "!(_id in path('drafts.**'))")
   */
  globalFilter?: string
}

/**
 * Compiled GROQ query result
 */
export interface CompiledGROQQuery {
  /**
   * The complete GROQ query string
   */
  query: string

  /**
   * Extracted parameters for the query
   * Use with Sanity client's params option
   */
  params: Record<string, unknown>
}

/**
 * GROQ Query Compiler
 * Converts universal QueryConfig to GROQ syntax
 */
export class QueryCompiler {
  private config: GROQCompilerConfig
  private paramCounter = 0
  private params: Record<string, unknown> = {}

  constructor(config: GROQCompilerConfig = {}) {
    this.config = config
  }

  /**
   * Compile a QueryConfig to a GROQ query
   */
  compile(query: QueryConfig): CompiledGROQQuery {
    // Reset state
    this.paramCounter = 0
    this.params = {}

    // Build GROQ query parts
    const base = this.compileBase(query)
    const filter = this.compileFilter(query)
    const projection = this.compileProjection(query)
    const orderBy = this.compileOrderBy(query)
    const slice = this.compileSlice(query)

    // Assemble query: *[filter] | order(...) [slice] {projection}
    let groq = base

    if (filter) {
      groq += `[${filter}]`
    }

    if (orderBy) {
      groq += ` | order(${orderBy})`
    }

    if (slice) {
      groq += `[${slice}]`
    }

    if (projection) {
      groq += ` ${projection}`
    }

    return {
      query: groq,
      params: this.params,
    }
  }

  /**
   * Extract parameters from QueryConfig for Sanity client
   */
  extractParams(query: QueryConfig): Record<string, unknown> {
    const params: Record<string, unknown> = {}

    // Add query params if provided
    if (query.params) {
      Object.assign(params, query.params)
    }

    // Add locale params
    if (query.locale) {
      params.locale = query.locale
    }

    if (query.fallbackLocale) {
      params.fallbackLocale = query.fallbackLocale
    }

    return params
  }

  /**
   * Compile the base selector (*[_type == "post"])
   */
  private compileBase(_query: QueryConfig): string {
    const { includeDrafts } = this.config

    // Start with all documents
    let base = '*'

    // Add draft filter if needed
    if (includeDrafts === false) {
      // Exclude drafts
      base = "*[!(_id in path('drafts.**'))]"
    }

    return base
  }

  /**
   * Compile filter conditions to GROQ
   */
  private compileFilter(query: QueryConfig): string {
    const filters: string[] = []

    // Add type filter
    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type]
      if (types.length === 1) {
        filters.push(`_type == ${this.addParam(types[0])}`)
      } else {
        filters.push(`_type in ${this.addParam(types)}`)
      }
    }

    // Add custom filters
    if (query.filter && query.filter.length > 0) {
      const compiledFilters = query.filter
        .map(f => this.compileFilterCondition(f))
        .filter(Boolean)

      if (compiledFilters.length > 0) {
        filters.push(...compiledFilters)
      }
    }

    // Add global filter from config
    if (this.config.globalFilter) {
      filters.push(this.config.globalFilter)
    }

    // Combine with AND
    return filters.join(' && ')
  }

  /**
   * Compile a single filter condition
   */
  private compileFilterCondition(condition: FilterCondition): string {
    // Handle logical operators
    if (condition.and) {
      const compiled = condition.and
        .map(c => this.compileFilterCondition(c))
        .filter(Boolean)
      return compiled.length > 0 ? `(${compiled.join(' && ')})` : ''
    }

    if (condition.or) {
      const compiled = condition.or
        .map(c => this.compileFilterCondition(c))
        .filter(Boolean)
      return compiled.length > 0 ? `(${compiled.join(' || ')})` : ''
    }

    if (condition.not) {
      const compiled = this.compileFilterCondition(condition.not)
      return compiled ? `!(${compiled})` : ''
    }

    // Handle field comparison
    if (!condition.field || !condition.operator) {
      return ''
    }

    const field = this.compileFieldPath(condition.field)
    const operator = condition.operator
    const value = condition.value

    return this.compileOperator(field, operator, value)
  }

  /**
   * Compile a field path (handles localization with coalesce)
   */
  private compileFieldPath(path: string): string {
    // Check if this is a localizable field (convention: detect locale patterns)
    // In a real implementation, you'd check against schema metadata
    // For now, we'll keep it simple and not auto-coalesce
    // Users can use projection for localization

    return path
  }

  /**
   * Compile a filter operator to GROQ
   */
  private compileOperator(
    field: string,
    operator: FilterOperator,
    value: unknown
  ): string {
    switch (operator) {
      case '==':
        return `${field} == ${this.addParam(value)}`

      case '!=':
        return `${field} != ${this.addParam(value)}`

      case '>':
        return `${field} > ${this.addParam(value)}`

      case '>=':
        return `${field} >= ${this.addParam(value)}`

      case '<':
        return `${field} < ${this.addParam(value)}`

      case '<=':
        return `${field} <= ${this.addParam(value)}`

      case 'in':
        return `${field} in ${this.addParam(value)}`

      case 'nin':
        return `!(${field} in ${this.addParam(value)})`

      case 'contains':
        // Array contains value
        return `${this.addParam(value)} in ${field}`

      case 'containsAny':
        // Array contains any of values
        if (Array.isArray(value)) {
          const checks = value.map(v => `${this.addParam(v)} in ${field}`)
          return `(${checks.join(' || ')})`
        }
        return `${this.addParam(value)} in ${field}`

      case 'containsAll':
        // Array contains all values
        if (Array.isArray(value)) {
          const checks = value.map(v => `${this.addParam(v)} in ${field}`)
          return `(${checks.join(' && ')})`
        }
        return `${this.addParam(value)} in ${field}`

      case 'match':
        // Full-text search using match operator
        return `${field} match ${this.addParam(value)}`

      case 'startsWith':
        // String starts with
        return `${field} match ${this.addParam(value + '*')}`

      case 'endsWith':
        // String ends with
        return `${field} match ${this.addParam('*' + value)}`

      case 'defined':
        // Field exists and is not null
        return `defined(${field})`

      case 'undefined':
        // Field does not exist or is null
        return `!defined(${field})`

      case 'references':
        // Document references another (using references() function)
        return `references(${this.addParam(value)})`

      default:
        // Unknown operator, return empty string
        console.warn(`Unknown filter operator: ${operator}`)
        return ''
    }
  }

  /**
   * Compile projection to GROQ
   */
  private compileProjection(query: QueryConfig): string {
    if (!query.projection) {
      return ''
    }

    const fields = this.compileProjectionObject(query.projection)

    // Handle reference resolution
    const resolveDepth = query.resolveReferences

    if (resolveDepth) {
      // Add reference resolution to projection
      // This would need more sophisticated handling in a real implementation
    }

    return `{${fields}}`
  }

  /**
   * Compile projection object to GROQ field list
   */
  private compileProjectionObject(
    projection: Projection<unknown>,
    _prefix = ''
  ): string {
    const fields: string[] = []

    for (const [key, value] of Object.entries(projection)) {
      if (value === true) {
        // Include field as-is
        fields.push(key)
      } else if (value === false) {
        // Exclude field (not directly supported in GROQ, would need to list all other fields)
        // Skip for now
        continue
      } else if (typeof value === 'string') {
        // Alias or path expression
        fields.push(`"${key}": ${value}`)
      } else if (typeof value === 'object' && value !== null) {
        // Nested projection or function
        if ('_fn' in value) {
          // Projection function (e.g., substring)
          const fn = value as { _fn: string; args?: unknown[] }
          const args = fn.args ? fn.args.map(a => this.addParam(a)).join(', ') : ''
          fields.push(`"${key}": ${fn._fn}(${args})`)
        } else if ('_expand' in value) {
          // Reference expansion
          const expand = value as { _expand: boolean; projection?: Projection<unknown> }
          if (expand.projection) {
            const nestedFields = this.compileProjectionObject(expand.projection)
            fields.push(`"${key}": ${key}->{${nestedFields}}`)
          } else {
            fields.push(`"${key}": ${key}->`)
          }
        } else {
          // Nested object projection
          const nestedFields = this.compileProjectionObject(value as Projection<unknown>)
          fields.push(`"${key}": {${nestedFields}}`)
        }
      }
    }

    return fields.join(', ')
  }

  /**
   * Compile orderBy to GROQ
   */
  private compileOrderBy(query: QueryConfig): string {
    if (!query.orderBy || query.orderBy.length === 0) {
      return ''
    }

    const orderClauses = query.orderBy.map((order: OrderBy) => {
      const direction = order.direction === 'desc' ? 'desc' : 'asc'
      return `${order.field} ${direction}`
    })

    return orderClauses.join(', ')
  }

  /**
   * Compile limit/offset to GROQ slice
   */
  private compileSlice(query: QueryConfig): string {
    const { limit, offset, cursor } = query

    // Cursor-based pagination (not directly supported in GROQ)
    // Would need to be implemented with filters on _id
    if (cursor) {
      console.warn('Cursor-based pagination not yet implemented for GROQ')
    }

    // Offset-based pagination
    if (offset !== undefined && limit !== undefined) {
      return `${offset}...${offset + limit}`
    }

    if (offset !== undefined) {
      return `${offset}...`
    }

    if (limit !== undefined) {
      return `0...${limit}`
    }

    return ''
  }

  /**
   * Add a parameter and return its reference
   */
  private addParam(value: unknown): string {
    const paramName = `p${this.paramCounter++}`
    this.params[paramName] = value
    return `$${paramName}`
  }

  /**
   * Compile a localized field access with coalesce
   * Example: coalesce(title.en, title.de, title)
   */
  compileLocalizedField(field: string, locale?: string): string {
    const { defaultLocale, fallbackLocales } = this.config
    const targetLocale = locale || defaultLocale

    if (!targetLocale && !fallbackLocales) {
      return field
    }

    const locales: string[] = []

    if (targetLocale) {
      locales.push(targetLocale)
    }

    if (fallbackLocales) {
      locales.push(...fallbackLocales)
    }

    // Add base field as final fallback
    locales.push('')

    const coalescePaths = locales.map(loc =>
      loc ? `${field}.${loc}` : field
    )

    return `coalesce(${coalescePaths.join(', ')})`
  }
}

/**
 * Create a GROQ compiler with config
 */
export function createGROQCompiler(config?: GROQCompilerConfig): QueryCompiler {
  return new QueryCompiler(config)
}
