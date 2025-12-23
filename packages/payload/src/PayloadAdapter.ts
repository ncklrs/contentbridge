/**
 * Payload CMS Adapter
 *
 * Implements BaseAdapter for Payload CMS
 * Supports both REST API and Local API modes
 */

import {
  BaseAdapter,
  type AdapterConfig,
  type UniversalRichText,
  type MediaAsset,
  type ResponsiveImageOptions,
  type ResponsiveImageSet,
  type PlaceholderOptions,
  type GeneratedTypes,
  type TypeGenerationOptions,
  type DocumentReference,
  type BaseDocument,
  type DocumentSchema,
  type QueryConfig,
  type QueryResult,
  type SingleResult,
  type TransactionOperation,
  type TransactionResult,
} from '@contentbridge/core'

import { QueryCompiler, type PayloadQueryConfig, type CompiledPayloadQuery } from './query/QueryCompiler'
import { SlateConverter } from './richtext/SlateConverter'

/**
 * API mode for Payload adapter
 * - 'rest': Use REST API (requires URL and API key)
 * - 'local': Use Local API (requires Payload instance)
 */
export type PayloadAPIMode = 'rest' | 'local'

/**
 * Payload adapter configuration
 */
export interface PayloadAdapterConfig extends AdapterConfig {
  /**
   * API mode: 'rest' or 'local'
   * @default 'rest'
   */
  mode?: PayloadAPIMode

  /**
   * Payload server URL (for REST mode)
   * @example 'https://api.example.com'
   */
  serverURL?: string

  /**
   * API key for authentication (for REST mode)
   */
  apiKey?: string

  /**
   * Payload instance (for Local API mode)
   * Must be provided if mode is 'local'
   */
  payload?: unknown // Type as `unknown` to avoid Payload peer dependency issues

  /**
   * Default locale for localized content
   */
  locale?: string

  /**
   * Fallback locale
   */
  fallbackLocale?: string

  /**
   * Query compiler configuration
   */
  queryConfig?: PayloadQueryConfig
}

/**
 * Payload CMS Adapter
 * Extends BaseAdapter to provide Payload-specific implementation
 */
export class PayloadAdapter extends BaseAdapter<PayloadAdapterConfig> {
  readonly name = 'payload'
  readonly version = '1.0.0'

  private mode: PayloadAPIMode
  private compiler: QueryCompiler
  private slateConverter: SlateConverter
  private baseURL?: string
  private headers: Record<string, string> = {}

  constructor(config: PayloadAdapterConfig) {
    super(config)

    this.mode = config.mode || 'rest'
    this.compiler = new QueryCompiler(config.queryConfig)
    this.slateConverter = new SlateConverter()

    // Initialize REST client if in REST mode
    if (this.mode === 'rest') {
      if (!config.serverURL) {
        throw new Error('serverURL is required for REST mode')
      }
      this.baseURL = config.serverURL.replace(/\/$/, '')
      this.headers = {
        'Content-Type': 'application/json',
      }
      if (config.apiKey) {
        this.headers['Authorization'] = `Bearer ${config.apiKey}`
      }
    } else {
      // Local API mode
      if (!config.payload) {
        throw new Error('payload instance is required for Local API mode')
      }
    }

    this.logger.info(`Initialized Payload adapter in ${this.mode} mode`)
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  async compileQuery<T = unknown>(queryConfig: QueryConfig<T>): Promise<string | object> {
    const compiled = this.compiler.compile(queryConfig)

    if (this.mode === 'rest') {
      // For REST mode, return URL parameters
      return this.compiler.toRESTParams(compiled)
    } else {
      // For Local API mode, return options object
      return this.compiler.toLocalAPIOptions(compiled)
    }
  }

  async executeQuery<T extends BaseDocument>(
    queryConfig: QueryConfig<T>
  ): Promise<QueryResult<T>> {
    const compiled = this.compiler.compile(queryConfig)
    const collection = Array.isArray(compiled.collection)
      ? compiled.collection[0]
      : compiled.collection

    if (this.mode === 'rest') {
      return this.executeRESTQuery(collection, compiled)
    } else {
      return this.executeLocalQuery(collection, compiled)
    }
  }

  async count(queryConfig: QueryConfig): Promise<number> {
    const compiled = this.compiler.compile(queryConfig)
    const collection = Array.isArray(compiled.collection)
      ? compiled.collection[0]
      : compiled.collection

    if (this.mode === 'rest') {
      const params = this.compiler.toRESTParams(compiled)
      const url = `${this.baseURL}/api/${collection}`

      const response = await fetch(url + '?' + new URLSearchParams(params), {
        headers: this.headers,
      })

      if (!response.ok) {
        throw new Error(`Payload API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.totalDocs || 0
    } else {
      const payload = this.config.payload as any
      const options = this.compiler.toLocalAPIOptions(compiled)

      const result = await payload.find({
        collection,
        ...options,
      })

      return result.totalDocs || 0
    }
  }

  async getById<T extends BaseDocument>(
    id: string,
    options?: {
      resolveReferences?: boolean | number
      includeDrafts?: boolean
    }
  ): Promise<SingleResult<T>> {
    try {
      // Extract collection from ID (if formatted as "collection/id")
      const [maybeCollection, maybeId] = id.includes('/') ? id.split('/') : [null, id]

      if (this.mode === 'rest') {
        const collection = maybeCollection || 'pages' // Default collection
        const docId = maybeId

        const params: Record<string, string> = {}
        if (options?.includeDrafts) {
          params.draft = 'true'
        }
        if (options?.resolveReferences) {
          params.depth = String(
            typeof options.resolveReferences === 'number'
              ? options.resolveReferences
              : 1
          )
        }

        const queryString = Object.keys(params).length > 0
          ? '?' + new URLSearchParams(params)
          : ''

        const url = `${this.baseURL}/api/${collection}/${docId}${queryString}`

        const response = await fetch(url, {
          headers: this.headers,
        })

        if (!response.ok) {
          if (response.status === 404) {
            return { data: null }
          }
          throw new Error(`Payload API error: ${response.statusText}`)
        }

        const data = await response.json()
        return { data: data as T }
      } else {
        const payload = this.config.payload as any
        const collection = maybeCollection || 'pages'
        const docId = maybeId

        const result = await payload.findByID({
          collection,
          id: docId,
          depth: typeof options?.resolveReferences === 'number'
            ? options.resolveReferences
            : options?.resolveReferences ? 1 : 0,
          draft: options?.includeDrafts,
        })

        return { data: result as T }
      }
    } catch (error) {
      this.logger.error(`Error fetching document by ID: ${id}`, error instanceof Error ? error : undefined)
      return { data: null }
    }
  }

  // ==========================================================================
  // Mutation Methods
  // ==========================================================================

  async create<T extends BaseDocument>(
    documentType: string,
    data: Omit<T, '_id' | '_type' | '_createdAt' | '_updatedAt' | '_rev'>
  ): Promise<T> {
    if (this.mode === 'rest') {
      const url = `${this.baseURL}/api/${documentType}`

      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`Payload API error: ${response.statusText}`)
      }

      const result = await response.json()
      return result.doc as T
    } else {
      const payload = this.config.payload as any

      const result = await payload.create({
        collection: documentType,
        data,
      })

      return result as T
    }
  }

  async update<T extends BaseDocument>(
    id: string,
    data: Partial<Omit<T, '_id' | '_type' | '_createdAt' | '_updatedAt' | '_rev'>>
  ): Promise<T> {
    const [collection, docId] = id.includes('/') ? id.split('/') : ['pages', id]

    if (this.mode === 'rest') {
      const url = `${this.baseURL}/api/${collection}/${docId}`

      const response = await fetch(url, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`Payload API error: ${response.statusText}`)
      }

      const result = await response.json()
      return result.doc as T
    } else {
      const payload = this.config.payload as any

      const result = await payload.update({
        collection,
        id: docId,
        data,
      })

      return result as T
    }
  }

  async patch<T extends BaseDocument>(
    id: string,
    patches: Array<{
      op: 'set' | 'unset' | 'insert' | 'replace'
      path: string
      value?: unknown
    }>
  ): Promise<T> {
    // Payload doesn't have native patch operations
    // Convert patches to update data
    const updateData: Record<string, unknown> = {}

    for (const patch of patches) {
      if (patch.op === 'set') {
        this.setNestedValue(updateData, patch.path, patch.value)
      } else if (patch.op === 'unset') {
        this.setNestedValue(updateData, patch.path, null)
      } else if (patch.op === 'replace') {
        // Replace is similar to set
        this.setNestedValue(updateData, patch.path, patch.value)
      }
      // insert would need more sophisticated handling with array manipulation
    }

    return this.update<T>(id, updateData as Partial<T>)
  }

  async delete<T extends BaseDocument>(id: string): Promise<T> {
    const [collection, docId] = id.includes('/') ? id.split('/') : ['pages', id]

    if (this.mode === 'rest') {
      const url = `${this.baseURL}/api/${collection}/${docId}`

      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.headers,
      })

      if (!response.ok) {
        throw new Error(`Payload API error: ${response.statusText}`)
      }

      const result = await response.json()
      return result.doc as T
    } else {
      const payload = this.config.payload as any

      const result = await payload.delete({
        collection,
        id: docId,
      })

      return result as T
    }
  }

  async transaction(operations: TransactionOperation[]): Promise<TransactionResult> {
    // Payload doesn't have native transaction support
    // Execute operations sequentially (not atomic)
    const results: Array<{ operation: TransactionOperation; result: BaseDocument }> = []

    try {
      for (const op of operations) {
        let result: BaseDocument

        switch (op.type) {
          case 'create':
            result = await this.create(op.document._type, op.document)
            break

          case 'update':
            result = await this.update(op.id, op.document)
            break

          case 'patch': {
            // Convert service layer PatchOperation to adapter patch format
            const adapterPatches = op.operations
              .filter(p => p.op === 'set' || p.op === 'unset')
              .map(p => ({
                op: p.op as 'set' | 'unset',
                path: p.path,
                value: 'value' in p ? p.value : undefined,
              }))
            result = await this.patch(op.id, adapterPatches)
            break
          }

          case 'delete':
            result = await this.delete(op.id)
            break

          default:
            throw new Error(`Unknown operation type: ${(op as TransactionOperation).type}`)
        }

        results.push({ operation: op, result })
      }

      return { results }
    } catch (error) {
      this.logger.error('Transaction failed', error instanceof Error ? error : undefined)
      throw error
    }
  }

  // ==========================================================================
  // Rich Text Methods
  // ==========================================================================

  async toUniversalRichText(nativeContent: unknown): Promise<UniversalRichText> {
    const slateNodes = nativeContent as any[]
    const content = this.slateConverter.fromSlate(slateNodes)

    return {
      _type: 'richtext',
      content,
    }
  }

  async fromUniversalRichText(universalContent: UniversalRichText): Promise<unknown> {
    return this.slateConverter.toSlate(universalContent.content)
  }

  // ==========================================================================
  // Media Methods
  // ==========================================================================

  async resolveMediaUrl(
    assetRef: string | DocumentReference | MediaAsset,
    options?: {
      width?: number
      height?: number
      format?: 'webp' | 'avif' | 'png' | 'jpg'
      quality?: number
      fit?: 'crop' | 'fill' | 'fillmax' | 'max' | 'scale' | 'clip' | 'min'
      [key: string]: unknown
    }
  ): Promise<string> {
    let assetId: string

    if (typeof assetRef === 'string') {
      assetId = assetRef
    } else if ('_ref' in assetRef) {
      assetId = assetRef._ref || ''
    } else {
      assetId = assetRef._id || ''
    }

    // Payload serves media at /api/media/{id}
    const baseUrl = `${this.baseURL || ''}/api/media/${assetId}`

    // Payload supports image transformations via query params
    const params: Record<string, string> = {}

    if (options?.width) params.width = String(options.width)
    if (options?.height) params.height = String(options.height)
    if (options?.quality) params.quality = String(options.quality)
    if (options?.format) params.format = options.format
    if (options?.fit) params.fit = options.fit

    const queryString = Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params)
      : ''

    return `${baseUrl}${queryString}`
  }

  async getResponsiveImage(
    assetRef: string | DocumentReference | MediaAsset,
    options: ResponsiveImageOptions
  ): Promise<ResponsiveImageSet> {
    const { widths, formats = ['webp', 'jpg'], quality = 80 } = options

    // Generate srcset for each format
    const sources = []

    for (const format of formats) {
      const srcset = await Promise.all(
        widths.map(async width => {
          const url = await this.resolveMediaUrl(assetRef, { width, format, quality })
          return `${url} ${width}w`
        })
      )

      sources.push({
        srcset: srcset.join(', '),
        type: `image/${format}`,
      })
    }

    // Get default src (largest width, first format)
    const src = await this.resolveMediaUrl(assetRef, {
      width: widths[widths.length - 1],
      format: formats[0],
      quality,
    })

    return {
      src,
      srcset: sources[0].srcset,
      sources,
      width: widths[widths.length - 1],
      height: 0, // Would need to fetch metadata
      aspectRatio: 0,
    }
  }

  async getPlaceholder(
    assetRef: string | DocumentReference | MediaAsset,
    options: PlaceholderOptions
  ): Promise<string> {
    // Generate a small thumbnail for LQIP
    const url = await this.resolveMediaUrl(assetRef, {
      width: options.width || 20,
      quality: options.quality || 10,
      format: 'jpg',
    })

    if (options.type === 'lqip') {
      // Would need to fetch and convert to base64
      // For now, return the URL
      return url
    }

    // blurhash and dominant-color would need server-side processing
    return url
  }

  // ==========================================================================
  // Type Generation Methods
  // ==========================================================================

  async generateTypes(
    _schemas: DocumentSchema[],
    _options?: TypeGenerationOptions
  ): Promise<GeneratedTypes> {
    // Type generation would introspect Payload config
    // This is a placeholder implementation
    throw new Error('Type generation not yet implemented for Payload adapter')
  }

  async generateZodSchemas(
    _schemas: DocumentSchema[],
    _options?: TypeGenerationOptions
  ): Promise<string> {
    // Zod schema generation
    throw new Error('Zod schema generation not yet implemented for Payload adapter')
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Execute REST API query
   */
  private async executeRESTQuery<T extends BaseDocument>(
    collection: string,
    compiled: CompiledPayloadQuery
  ): Promise<QueryResult<T>> {
    const params = this.compiler.toRESTParams(compiled)
    const url = `${this.baseURL}/api/${collection}`

    const response = await fetch(url + '?' + new URLSearchParams(params), {
      headers: this.headers,
    })

    if (!response.ok) {
      throw new Error(`Payload API error: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      data: data.docs as T[],
      total: data.totalDocs,
      hasMore: data.hasNextPage,
    }
  }

  /**
   * Execute Local API query
   */
  private async executeLocalQuery<T extends BaseDocument>(
    collection: string,
    compiled: CompiledPayloadQuery
  ): Promise<QueryResult<T>> {
    const payload = this.config.payload as any
    const options = this.compiler.toLocalAPIOptions(compiled)

    const result = await payload.find({
      collection,
      ...options,
    })

    return {
      data: result.docs as T[],
      total: result.totalDocs,
      hasMore: result.hasNextPage,
    }
  }

  /**
   * Set nested value in object by path
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.')
    let current = obj

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!(part in current)) {
        current[part] = {}
      }
      current = current[part] as Record<string, unknown>
    }

    current[parts[parts.length - 1]] = value
  }

  /**
   * Get the Payload instance (for Local API mode)
   */
  getPayload(): unknown {
    return this.config.payload
  }

  /**
   * Get the query compiler instance
   */
  getCompiler(): QueryCompiler {
    return this.compiler
  }

  /**
   * Get the Slate converter
   */
  getSlateConverter(): SlateConverter {
    return this.slateConverter
  }
}

/**
 * Create a Payload adapter instance
 */
export function createPayloadAdapter(config: PayloadAdapterConfig): PayloadAdapter {
  return new PayloadAdapter(config)
}
