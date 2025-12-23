/**
 * Strapi CMS Adapter
 *
 * Implements BaseAdapter for Strapi CMS (v4/v5)
 * Provides unified API for content operations using Strapi's REST API
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import {
  BaseAdapter,
  type AdapterConfig,
  type UniversalRichText,
  type MediaAsset,
  type ResponsiveImageOptions,
  type ResponsiveImageSet,
  type PlaceholderOptions,
  type TransactionOperation,
  type TransactionResult,
} from '@contentbridge/core'
import type {
  BaseDocument,
  DocumentSchema,
  DocumentReference,
  QueryConfig,
  QueryResult,
  SingleResult,
  GeneratedTypes,
  TypeGenerationOptions,
} from '@contentbridge/core'

import { QueryCompiler, type QueryCompilerConfig } from './query/QueryCompiler'
import { BlocksConverter } from './richtext/BlocksConverter'

/**
 * Strapi adapter configuration
 */
export interface StrapiAdapterConfig extends AdapterConfig {
  /**
   * Strapi API base URL (e.g., 'https://api.example.com')
   */
  baseUrl: string

  /**
   * API token for authenticated requests
   */
  apiToken?: string

  /**
   * API version (v4 or v5)
   * @default 'v4'
   */
  apiVersion?: 'v4' | 'v5'

  /**
   * Include draft/unpublished content
   * @default false
   */
  includeDrafts?: boolean

  /**
   * Default locale for i18n content
   */
  defaultLocale?: string

  /**
   * Query compiler configuration
   */
  queryConfig?: QueryCompilerConfig

  /**
   * Custom axios configuration
   */
  axiosConfig?: AxiosRequestConfig
}

/**
 * Strapi single item response
 */
interface StrapiSingleResponse<T> {
  data: T & {
    id: number
    attributes: Record<string, unknown>
  }
  meta?: Record<string, unknown>
}

/**
 * Strapi collection response
 */
interface StrapiCollectionResponse<T> {
  data: Array<T & {
    id: number
    attributes: Record<string, unknown>
  }>
  meta?: {
    pagination?: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

/**
 * Strapi CMS Adapter
 * Implements BaseAdapter for Strapi
 */
export class StrapiAdapter extends BaseAdapter<StrapiAdapterConfig> {
  readonly name = 'strapi'
  readonly version = '1.0.0'

  private client: AxiosInstance
  private compiler: QueryCompiler
  private blocksConverter: BlocksConverter

  constructor(config: StrapiAdapterConfig) {
    super(config)

    // Initialize HTTP client
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiToken && {
          Authorization: `Bearer ${config.apiToken}`,
        }),
      },
      ...config.axiosConfig,
    })

    // Initialize utilities
    this.compiler = new QueryCompiler({
      defaultLocale: config.defaultLocale,
      includeDrafts: config.includeDrafts,
      ...config.queryConfig,
    })

    this.blocksConverter = new BlocksConverter()
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  async compileQuery<T = unknown>(config: QueryConfig<T>): Promise<string> {
    const compiled = this.compiler.compile(config)
    return `${compiled.endpoint}?${compiled.params.toString()}`
  }

  async executeQuery<T extends BaseDocument>(
    config: QueryConfig<T>
  ): Promise<QueryResult<T>> {
    try {
      const compiled = this.compiler.compile(config)

      this.logger.debug('Executing Strapi query', {
        endpoint: compiled.endpoint,
        params: compiled.paramsObject,
      })

      const response = await this.client.get<StrapiCollectionResponse<T>>(
        compiled.endpoint,
        {
          params: Object.fromEntries(compiled.params.entries()),
        }
      )

      // Transform Strapi response to BaseDocument format
      const data = this.transformCollectionResponse(response.data)

      return {
        data,
        total: response.data.meta?.pagination?.total,
        hasMore:
          response.data.meta?.pagination?.page !==
          response.data.meta?.pagination?.pageCount,
        timing: undefined, // Could add timing middleware
      }
    } catch (error) {
      this.logger.error('Error executing query', error as Error)
      throw error
    }
  }

  async count(config: QueryConfig): Promise<number> {
    try {
      // Execute query with pageSize=1 to get count from meta
      const compiled = this.compiler.compile({
        ...config,
        limit: 1,
      })

      const response = await this.client.get<StrapiCollectionResponse<unknown>>(
        compiled.endpoint,
        {
          params: Object.fromEntries(compiled.params.entries()),
        }
      )

      return response.data.meta?.pagination?.total || 0
    } catch (error) {
      this.logger.error('Error counting documents', error as Error)
      return 0
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
      // Extract type from ID if it contains type prefix (e.g., "post-123")
      const [type, numericId] = this.parseDocumentId(id)

      const endpoint = `/api/${this.compiler['pluralizeApiId'](type)}/${numericId}`

      const params: Record<string, unknown> = {}

      if (options?.resolveReferences) {
        params.populate = options.resolveReferences === true ? '*' : 'deep'
      }

      if (options?.includeDrafts) {
        params.publicationState = 'preview'
      }

      const response = await this.client.get<StrapiSingleResponse<T>>(endpoint, {
        params,
      })

      const data = this.transformSingleResponse<T>(response.data.data, type)

      return {
        data,
        timing: undefined,
      }
    } catch (error) {
      this.logger.error(`Error fetching document by ID: ${id}`, error as Error)
      return {
        data: null,
        timing: undefined,
      }
    }
  }

  // ==========================================================================
  // Mutation Methods
  // ==========================================================================

  async create<T extends BaseDocument>(
    documentType: string,
    data: Omit<T, '_id' | '_type' | '_createdAt' | '_updatedAt' | '_rev'>
  ): Promise<T> {
    try {
      const endpoint = `/api/${this.compiler['pluralizeApiId'](documentType)}`

      // Strapi expects data wrapped in 'data' property
      const response = await this.client.post<StrapiSingleResponse<T>>(endpoint, {
        data: this.prepareDataForStrapi(data),
      })

      return this.transformSingleResponse<T>(response.data.data, documentType)
    } catch (error) {
      this.logger.error('Error creating document', error as Error)
      throw error
    }
  }

  async update<T extends BaseDocument>(
    id: string,
    data: Partial<Omit<T, '_id' | '_type' | '_createdAt' | '_updatedAt' | '_rev'>>
  ): Promise<T> {
    try {
      const [type, numericId] = this.parseDocumentId(id)
      const endpoint = `/api/${this.compiler['pluralizeApiId'](type)}/${numericId}`

      const response = await this.client.put<StrapiSingleResponse<T>>(endpoint, {
        data: this.prepareDataForStrapi(data),
      })

      return this.transformSingleResponse<T>(response.data.data, type)
    } catch (error) {
      this.logger.error(`Error updating document: ${id}`, error as Error)
      throw error
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
    try {
      // Convert patches to partial update object
      const updateData: Record<string, unknown> = {}

      for (const patch of patches) {
        if (patch.op === 'set') {
          updateData[patch.path] = patch.value
        } else if (patch.op === 'unset') {
          updateData[patch.path] = null
        }
        // insert and replace would need more complex logic
      }

      return this.update<T>(id, updateData as Partial<T>)
    } catch (error) {
      this.logger.error(`Error patching document: ${id}`, error as Error)
      throw error
    }
  }

  async delete<T extends BaseDocument>(id: string): Promise<T> {
    try {
      const [type, numericId] = this.parseDocumentId(id)
      const endpoint = `/api/${this.compiler['pluralizeApiId'](type)}/${numericId}`

      const response = await this.client.delete<StrapiSingleResponse<T>>(endpoint)

      return this.transformSingleResponse<T>(response.data.data, type)
    } catch (error) {
      this.logger.error(`Error deleting document: ${id}`, error as Error)
      throw error
    }
  }

  async transaction(operations: TransactionOperation[]): Promise<TransactionResult> {
    // Strapi doesn't natively support transactions
    // We'll execute operations sequentially and rollback on error
    const results: Array<{ operation: TransactionOperation; result: BaseDocument | null }> = []

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

          case 'patch':
            result = await this.patch(op.id, op.operations as Array<{
              op: 'set' | 'unset' | 'insert' | 'replace'
              path: string
              value?: unknown
            }>)
            break

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
      this.logger.error('Transaction failed', error as Error)
      // TODO: Implement rollback logic
      throw error
    }
  }

  // ==========================================================================
  // Rich Text Methods
  // ==========================================================================

  async toUniversalRichText(nativeContent: unknown): Promise<UniversalRichText> {
    try {
      const blocks = Array.isArray(nativeContent) ? nativeContent : [nativeContent]
      const content = this.blocksConverter.fromBlocks(blocks)

      return {
        _type: 'richtext',
        content,
      }
    } catch (error) {
      this.logger.error('Error converting to universal rich text', error as Error)
      throw error
    }
  }

  async fromUniversalRichText(universalContent: UniversalRichText): Promise<unknown> {
    try {
      return this.blocksConverter.toBlocks(universalContent.content)
    } catch (error) {
      this.logger.error('Error converting from universal rich text', error as Error)
      throw error
    }
  }

  // ==========================================================================
  // Media Methods
  // ==========================================================================

  async resolveMediaUrl(
    assetRef: string | DocumentReference | MediaAsset,
    _options?: {
      width?: number
      height?: number
      format?: 'webp' | 'avif' | 'png' | 'jpg'
      quality?: number
      fit?: 'crop' | 'fill' | 'fillmax' | 'max' | 'scale' | 'clip' | 'min'
      [key: string]: unknown
    }
  ): Promise<string> {
    try {
      let url: string

      if (typeof assetRef === 'string') {
        url = assetRef
      } else if ('url' in assetRef) {
        url = assetRef.url || ''
      } else if ('_ref' in assetRef) {
        // For reference types, we'd need to fetch the asset
        // This is a simplified implementation
        url = assetRef._ref
      } else {
        throw new Error('Invalid asset reference')
      }

      // If URL is relative, prepend base URL
      if (!url.startsWith('http')) {
        url = `${this.config.baseUrl}${url}`
      }

      // Strapi doesn't have built-in image transformation
      // Would need to integrate with a service like Cloudinary or Imgix
      // For now, return the original URL

      return url
    } catch (error) {
      this.logger.error('Error resolving media URL', error as Error)
      throw error
    }
  }

  async getResponsiveImage(
    assetRef: string | DocumentReference | MediaAsset,
    _options: ResponsiveImageOptions
  ): Promise<ResponsiveImageSet> {
    // Strapi doesn't provide built-in responsive image generation
    // This would typically be handled by a plugin or external service
    const url = await this.resolveMediaUrl(assetRef)

    // Return a basic responsive set
    return {
      src: url,
      srcset: url,
      sources: [{ srcset: url }],
      width: 0,
      height: 0,
      aspectRatio: 1,
    }
  }

  async getPlaceholder(
    _assetRef: string | DocumentReference | MediaAsset,
    _options: PlaceholderOptions
  ): Promise<string> {
    // Strapi doesn't provide built-in placeholder generation
    // This would need to be implemented with a plugin or service
    return ''
  }

  // ==========================================================================
  // Type Generation Methods
  // ==========================================================================

  async generateTypes(
    _schemas: DocumentSchema[],
    _options?: TypeGenerationOptions
  ): Promise<GeneratedTypes> {
    // Type generation would require introspecting Strapi's content-types
    // This is a placeholder implementation
    this.logger.warn('Type generation not yet implemented for Strapi')

    return {
      interfaces: '',
      schemas: '',
      exports: '',
      imports: [],
    }
  }

  async generateZodSchemas(
    _schemas: DocumentSchema[],
    _options?: TypeGenerationOptions
  ): Promise<string> {
    // Zod schema generation placeholder
    this.logger.warn('Zod schema generation not yet implemented for Strapi')
    return ''
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Parse document ID to extract type and numeric ID
   * Format: "type-id" or just "id"
   */
  private parseDocumentId(id: string): [string, string] {
    const parts = id.split('-')
    if (parts.length > 1) {
      const numericId = parts[parts.length - 1]
      const type = parts.slice(0, -1).join('-')
      return [type, numericId]
    }
    // If no type prefix, try to extract from context or throw
    throw new Error(
      `Invalid document ID format: ${id}. Expected format: "type-id" (e.g., "post-123")`
    )
  }

  /**
   * Transform Strapi single response to BaseDocument
   */
  private transformSingleResponse<T extends BaseDocument = BaseDocument>(
    response: { id: number; attributes: Record<string, unknown> },
    type: string
  ): T {
    const result: BaseDocument = {
      _id: `${type}-${response.id}`,
      _type: type,
      ...response.attributes,
      _createdAt: response.attributes.createdAt as string | undefined,
      _updatedAt: response.attributes.updatedAt as string | undefined,
    }
    return result as T
  }

  /**
   * Transform Strapi collection response to BaseDocument array
   */
  private transformCollectionResponse<T extends BaseDocument>(
    response: StrapiCollectionResponse<T>
  ): T[] {
    return response.data.map(item => {
      // Extract type from item or use generic
      const type = (item.attributes as Record<string, unknown>).__type as string || 'document'

      return {
        _id: `${type}-${item.id}`,
        _type: type,
        ...item.attributes,
        _createdAt: item.attributes.createdAt as string | undefined,
        _updatedAt: item.attributes.updatedAt as string | undefined,
      } as T
    })
  }

  /**
   * Prepare data for Strapi API (remove internal fields)
   */
  private prepareDataForStrapi(data: Record<string, unknown>): Record<string, unknown> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, _type, _createdAt, _updatedAt, _rev, ...cleanData } = data
    return cleanData
  }

  /**
   * Get the underlying HTTP client for advanced operations
   */
  getClient(): AxiosInstance {
    return this.client
  }

  /**
   * Get the query compiler instance
   */
  getCompiler(): QueryCompiler {
    return this.compiler
  }

  /**
   * Get the Blocks converter instance
   */
  getBlocksConverter(): BlocksConverter {
    return this.blocksConverter
  }
}

/**
 * Create a Strapi adapter instance
 */
export function createStrapiAdapter(config: StrapiAdapterConfig): StrapiAdapter {
  return new StrapiAdapter(config)
}
