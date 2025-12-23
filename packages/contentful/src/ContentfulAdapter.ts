/**
 * Contentful CMS Adapter
 *
 * Implements BaseAdapter for Contentful CMS
 * Supports both Content Delivery API (CDA) and Content Management API (CMA)
 * Provides unified API for content operations with Contentful
 */

import type {
  ContentfulClientApi,
  Entry,
} from 'contentful'
import type {
  PlainClientAPI,
} from 'contentful-management'
import type {
  BaseDocument,
  DocumentReference,
  DocumentSchema,
  QueryConfig,
  QueryResult,
  SingleResult,
  AdapterConfig,
  UniversalRichText,
  MediaAsset,
  ResponsiveImageOptions,
  ResponsiveImageSet,
  PlaceholderOptions,
  GeneratedTypes,
  TypeGenerationOptions,
  TransactionOperation,
  TransactionResult,
} from '@contentbridge/core'
import { BaseAdapter } from '@contentbridge/core'

import { QueryCompiler, type ContentfulCompilerConfig } from './query/QueryCompiler'
import { RichTextConverter } from './richtext/RichTextConverter'

/**
 * Simplified interface for Contentful Management API Environment
 * This represents the subset of the SDK's Environment type that we use.
 *
 * @internal
 */
interface ContentfulEnvironment {
  createEntry(
    contentTypeId: string,
    data: { fields: Record<string, unknown> }
  ): Promise<ContentfulEntry>
  getEntry(entryId: string): Promise<ContentfulEntry>
}

/**
 * Simplified interface for Contentful Management API Entry
 *
 * @internal
 */
interface ContentfulEntry {
  sys: {
    id: string
    contentType?: { sys: { id: string } }
    createdAt: string
    updatedAt: string
    revision: number
  }
  fields: Record<string, Record<string, unknown>>
  publish(): Promise<ContentfulEntry>
  update(): Promise<ContentfulEntry>
  unpublish(): Promise<ContentfulEntry>
  delete(): Promise<void>
  isPublished(): boolean
}

/**
 * Contentful adapter configuration
 */
export interface ContentfulAdapterConfig extends AdapterConfig {
  /**
   * Contentful space ID
   */
  spaceId: string

  /**
   * Contentful environment (default: 'master')
   */
  environment?: string

  /**
   * Access token for Content Delivery API
   * Used for read operations
   */
  accessToken?: string

  /**
   * Preview access token for Preview API
   * Used when includeDrafts is true
   */
  previewToken?: string

  /**
   * Management token for Content Management API
   * Required for write operations
   */
  managementToken?: string

  /**
   * Use preview API for draft content
   * @default false
   */
  usePreview?: boolean

  /**
   * Default locale
   * @default 'en-US'
   */
  defaultLocale?: string

  /**
   * Query compiler configuration
   */
  compilerConfig?: ContentfulCompilerConfig

  /**
   * Contentful client instances (optional, can be provided externally)
   */
  deliveryClient?: ContentfulClientApi<undefined>
  managementClient?: PlainClientAPI
}


/**
 * Contentful CMS Adapter
 * Implements BaseAdapter for Contentful
 */
export class ContentfulAdapter extends BaseAdapter<ContentfulAdapterConfig> {
  readonly name = 'contentful'
  readonly version = '1.0.0'

  private deliveryClient?: ContentfulClientApi<undefined>
  private managementClient?: PlainClientAPI
  private compiler: QueryCompiler
  private richTextConverter: RichTextConverter
  private spaceId: string
  private environment: string

  constructor(config: ContentfulAdapterConfig) {
    super(config)

    this.spaceId = config.spaceId
    this.environment = config.environment || 'master'
    this.deliveryClient = config.deliveryClient
    this.managementClient = config.managementClient

    // Initialize utilities
    this.compiler = new QueryCompiler(config.compilerConfig)
    this.richTextConverter = new RichTextConverter()
  }

  /**
   * Initialize the adapter
   * Sets up Contentful clients if not provided
   */
  async initialize(): Promise<void> {
    await super.initialize()

    // Clients should be provided externally to avoid bundling SDK
    if (!this.deliveryClient && !this.config.accessToken) {
      throw new Error('Either deliveryClient or accessToken must be provided')
    }

    if (!this.deliveryClient && this.config.accessToken) {
      this.logger.warn('No delivery client provided. Create one using contentful.createClient()')
    }

    this.logger.info('Contentful adapter initialized', {
      spaceId: this.spaceId,
      environment: this.environment,
      hasDeliveryClient: !!this.deliveryClient,
      hasManagementClient: !!this.managementClient,
    })
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  async compileQuery<T = unknown>(config: QueryConfig<T>): Promise<object> {
    return this.compiler.compile(config)
  }

  async executeQuery<T extends BaseDocument>(
    config: QueryConfig<T>
  ): Promise<QueryResult<T>> {
    if (!this.deliveryClient) {
      throw new Error('Delivery client not initialized')
    }

    const startTime = Date.now()

    try {
      const query = this.compiler.compile(config)
      this.logger.debug('Executing Contentful query', { query })

      const response = await this.deliveryClient.getEntries(query as any)

      const data = response.items.map((entry: Entry) =>
        this.mapEntryToDocument<T>(entry as Entry)
      )

      const timing = Date.now() - startTime

      return {
        data,
        total: response.total,
        hasMore: response.skip + response.items.length < response.total,
        timing,
        cacheStatus: 'miss', // Contentful doesn't expose cache status
      }
    } catch (error) {
      this.logger.error('Query execution failed', error as Error)
      throw error
    }
  }

  async count(config: QueryConfig): Promise<number> {
    if (!this.deliveryClient) {
      throw new Error('Delivery client not initialized')
    }

    try {
      const query = this.compiler.compile({ ...config, limit: 1 })
      const response = await this.deliveryClient.getEntries(query as any)
      return response.total
    } catch (error) {
      this.logger.error('Count query failed', error as Error)
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
    if (!this.deliveryClient) {
      throw new Error('Delivery client not initialized')
    }

    const startTime = Date.now()

    try {
      const query = this.compiler.buildGetByIdQuery(id, {
        locale: this.config.defaultLocale,
        include: typeof options?.resolveReferences === 'number'
          ? options.resolveReferences
          : options?.resolveReferences ? 1 : 0,
      })

      const response = await this.deliveryClient.getEntries({
        ...query,
        limit: 1,
      } as any)

      const entry = response.items[0]
      const data = entry ? this.mapEntryToDocument<T>(entry as Entry) : null

      return {
        data,
        timing: Date.now() - startTime,
        cacheStatus: 'miss',
      }
    } catch (error) {
      this.logger.error('Failed to get document by ID', error as Error)
      return { data: null, timing: Date.now() - startTime }
    }
  }

  // ==========================================================================
  // Mutation Methods
  // ==========================================================================

  async create<T extends BaseDocument>(
    documentType: string,
    data: Omit<T, '_id' | '_type' | '_createdAt' | '_updatedAt' | '_rev'>
  ): Promise<T> {
    if (!this.managementClient) {
      throw new Error('Management client not initialized. Write operations require managementToken.')
    }

    try {
      this.logger.debug('Creating Contentful entry', { documentType })

      // Map universal document to Contentful fields
      const fields = this.mapDocumentToFields(data)

      // Create entry using management API
      const environment = await this.getManagementEnvironment()

      const entry = await environment.createEntry(documentType, {
        fields,
      })

      // Publish the entry
      const published = await entry.publish()

      // Map back to universal document
      return this.mapEntryToDocument<T>(published as any)
    } catch (error) {
      this.logger.error('Failed to create entry', error as Error)
      throw error
    }
  }

  async update<T extends BaseDocument>(
    id: string,
    data: Partial<Omit<T, '_id' | '_type' | '_createdAt' | '_updatedAt' | '_rev'>>
  ): Promise<T> {
    if (!this.managementClient) {
      throw new Error('Management client not initialized. Write operations require managementToken.')
    }

    try {
      this.logger.debug('Updating Contentful entry', { id })

      const environment = await this.getManagementEnvironment()

      // Get current entry
      const entry = await environment.getEntry(id)

      // Update fields
      const fields = this.mapDocumentToFields(data)
      Object.assign(entry.fields, fields)

      // Save and publish
      const updated = await entry.update()
      const published = await updated.publish()

      return this.mapEntryToDocument<T>(published as any)
    } catch (error) {
      this.logger.error('Failed to update entry', error as Error)
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
    if (!this.managementClient) {
      throw new Error('Management client not initialized')
    }

    try {
      const environment = await this.getManagementEnvironment()

      const entry = await environment.getEntry(id)

      // Apply patches
      for (const patch of patches) {
        const fieldPath = patch.path.split('.')
        const fieldName = fieldPath[0]

        switch (patch.op) {
          case 'set':
          case 'replace':
            if (!entry.fields[fieldName]) {
              entry.fields[fieldName] = {}
            }
            // Contentful requires locale wrapper
            const locale = this.config.defaultLocale || 'en-US'
            entry.fields[fieldName][locale] = patch.value
            break

          case 'unset':
            delete entry.fields[fieldName]
            break

          case 'insert':
            // Array insertion - not directly supported
            this.logger.warn('Array insert operation not fully supported')
            break
        }
      }

      const updated = await entry.update()
      const published = await updated.publish()

      return this.mapEntryToDocument<T>(published as any)
    } catch (error) {
      this.logger.error('Failed to patch entry', error as Error)
      throw error
    }
  }

  async delete<T extends BaseDocument>(id: string): Promise<T> {
    if (!this.managementClient) {
      throw new Error('Management client not initialized')
    }

    try {
      const environment = await this.getManagementEnvironment()

      const entry = await environment.getEntry(id)
      const snapshot = this.mapEntryToDocument<T>(entry as unknown as Entry)

      // Unpublish first, then delete
      if (entry.isPublished()) {
        await entry.unpublish()
      }
      await entry.delete()

      return snapshot
    } catch (error) {
      this.logger.error('Failed to delete entry', error as Error)
      throw error
    }
  }

  async transaction(operations: TransactionOperation[]): Promise<TransactionResult> {
    // Contentful doesn't support atomic transactions
    // Execute operations sequentially and rollback on failure
    this.logger.warn('Contentful does not support atomic transactions. Operations will be executed sequentially.')

    const results: TransactionResult['results'] = []
    const createdIds: string[] = []

    try {
      for (const op of operations) {
        let result: BaseDocument

        switch (op.type) {
          case 'create':
            result = await this.create((op.document as any)._type || 'default', op.document as any)
            createdIds.push(result._id)
            break

          case 'update':
            result = await this.update(op.id!, op.document as any)
            break

          case 'patch':
            result = await this.patch(op.id!, (op as any).patches || [])
            break

          case 'delete':
            result = await this.delete(op.id!)
            break

          default:
            throw new Error(`Unknown operation type: ${(op as any).type}`)
        }

        results.push({ operation: op, result })
      }

      return {
        results,
      }
    } catch (error) {
      // Attempt rollback of created entries
      this.logger.error('Transaction failed, attempting rollback', error as Error)

      for (const id of createdIds) {
        try {
          await this.delete(id)
        } catch (rollbackError) {
          this.logger.error('Rollback failed', rollbackError as Error)
        }
      }

      throw error
    }
  }

  // ==========================================================================
  // Rich Text Methods
  // ==========================================================================

  async toUniversalRichText(nativeContent: unknown): Promise<UniversalRichText> {
    const blocks = this.richTextConverter.fromContentfulRichText(nativeContent)
    return {
      _type: 'richtext',
      content: blocks,
    }
  }

  async fromUniversalRichText(universalContent: UniversalRichText): Promise<unknown> {
    return this.richTextConverter.toContentfulRichText(universalContent.content)
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
    } else if ('_ref' in assetRef && assetRef._ref) {
      assetId = assetRef._ref
    } else if ('_id' in assetRef && assetRef._id) {
      assetId = assetRef._id
    } else {
      throw new Error('Invalid asset reference')
    }

    if (!this.deliveryClient) {
      throw new Error('Delivery client not initialized')
    }

    try {
      const asset = await this.deliveryClient.getAsset(assetId)
      let url = (asset.fields.file as any)?.url

      if (!url) {
        throw new Error('Asset has no URL')
      }

      // Ensure url is a string
      url = String(url)

      // Ensure https
      if (url.startsWith('//')) {
        url = `https:${url}`
      }

      // Add Contentful Images API parameters
      const params = new URLSearchParams()

      if (options?.width) params.append('w', String(options.width))
      if (options?.height) params.append('h', String(options.height))
      if (options?.format) params.append('fm', options.format)
      if (options?.quality) params.append('q', String(options.quality))
      if (options?.fit) params.append('fit', options.fit)

      const queryString = params.toString()
      return queryString ? `${url}?${queryString}` : url
    } catch (error) {
      this.logger.error('Failed to resolve media URL', error as Error)
      throw error
    }
  }

  async getResponsiveImage(
    assetRef: string | DocumentReference | MediaAsset,
    options: ResponsiveImageOptions
  ): Promise<ResponsiveImageSet> {
    const { widths, formats = ['webp', 'jpg'], quality = 80 } = options

    // Get base URL
    const baseUrl = await this.resolveMediaUrl(assetRef)

    // Generate srcset for each format
    const sources = formats.map(format => {
      const srcset = widths
        .map(width => {
          const url = `${baseUrl}?w=${width}&fm=${format}&q=${quality}`
          return `${url} ${width}w`
        })
        .join(', ')

      return {
        srcset,
        type: `image/${format}`,
      }
    })

    // Get asset dimensions
    let width = widths[0]
    let height = widths[0]
    let aspectRatio = 1

    if (typeof assetRef === 'object' && 'metadata' in assetRef) {
      const metadata = assetRef.metadata as any
      if (metadata?.dimensions) {
        width = metadata.dimensions.width
        height = metadata.dimensions.height
        aspectRatio = width / height
      }
    }

    return {
      src: await this.resolveMediaUrl(assetRef, { width: widths[0] }),
      srcset: sources[0].srcset,
      sources,
      width,
      height,
      aspectRatio,
    }
  }

  async getPlaceholder(
    assetRef: string | DocumentReference | MediaAsset,
    options: PlaceholderOptions
  ): Promise<string> {
    const { type, width = 20, quality = 10 } = options

    if (type === 'lqip') {
      // Generate low-quality placeholder
      const url = await this.resolveMediaUrl(assetRef, {
        width,
        quality,
        format: 'jpg',
      })

      // In a real implementation, you'd fetch and convert to base64
      return url
    }

    if (type === 'blurhash') {
      // Contentful doesn't provide blurhash
      // Would need to generate client-side
      throw new Error('Blurhash not supported. Generate client-side or use LQIP.')
    }

    if (type === 'dominant-color') {
      // Would need to analyze image
      throw new Error('Dominant color extraction not implemented')
    }

    throw new Error(`Unknown placeholder type: ${type}`)
  }

  // ==========================================================================
  // Type Generation Methods
  // ==========================================================================

  async generateTypes(
    _schemas: DocumentSchema[],
    _options?: TypeGenerationOptions
  ): Promise<GeneratedTypes> {
    // Type generation would introspect Contentful content types
    // and generate TypeScript interfaces
    // This is a complex feature - placeholder for now
    throw new Error('Type generation not yet implemented for Contentful adapter')
  }

  async generateZodSchemas(
    _schemas: DocumentSchema[],
    _options?: TypeGenerationOptions
  ): Promise<string> {
    throw new Error('Zod schema generation not yet implemented for Contentful adapter')
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Map Contentful entry to universal document
   */
  private mapEntryToDocument<T extends BaseDocument>(entry: Entry<any>): T {
    const locale = this.config.defaultLocale || 'en-US'
    const fields: Record<string, unknown> = {}

    // Extract fields for the target locale
    for (const [key, value] of Object.entries(entry.fields)) {
      if (typeof value === 'object' && value !== null && locale in value) {
        fields[key] = (value as any)[locale]
      } else {
        fields[key] = value
      }
    }

    return {
      _id: entry.sys.id,
      _type: entry.sys.contentType?.sys.id || 'unknown',
      _createdAt: entry.sys.createdAt,
      _updatedAt: entry.sys.updatedAt,
      _rev: String(entry.sys.revision),
      ...fields,
    } as T
  }

  /**
   * Map universal document to Contentful fields
   */
  private mapDocumentToFields(data: Partial<BaseDocument>): Record<string, any> {
    const locale = this.config.defaultLocale || 'en-US'
    const fields: Record<string, any> = {}

    // Exclude system fields
    const { _id, _type, _createdAt, _updatedAt, _rev, ...rest } = data

    // Wrap each field in locale object
    for (const [key, value] of Object.entries(rest)) {
      fields[key] = {
        [locale]: value,
      }
    }

    return fields
  }

  /**
   * Get the delivery client (throws if not available)
   */
  getDeliveryClient(): ContentfulClientApi<undefined> {
    if (!this.deliveryClient) {
      throw new Error('Delivery client not initialized')
    }
    return this.deliveryClient
  }

  /**
   * Get the management client (throws if not available)
   */
  getManagementClient(): PlainClientAPI {
    if (!this.managementClient) {
      throw new Error('Management client not initialized. Provide managementToken in config.')
    }
    return this.managementClient
  }

  /**
   * Get the Contentful Management API environment
   *
   * Note: The contentful-management SDK uses a fluent API with complex return types.
   * This helper encapsulates the environment access pattern and returns a typed interface
   * for common operations (createEntry, getEntry, etc.).
   *
   * @internal
   */
  private async getManagementEnvironment(): Promise<ContentfulEnvironment> {
    if (!this.managementClient) {
      throw new Error('Management client not initialized. Write operations require managementToken.')
    }

    // The SDK's getSpace().then(space.getEnvironment()) chain returns complex types
    // We use unknown with a runtime type that matches the API surface we need
    const client = this.managementClient as unknown as {
      getSpace(spaceId: string): Promise<{ getEnvironment(envId: string): Promise<ContentfulEnvironment> }>
    }

    const space = await client.getSpace(this.spaceId)
    return space.getEnvironment(this.environment)
  }

  /**
   * Get the query compiler
   */
  getCompiler(): QueryCompiler {
    return this.compiler
  }

  /**
   * Get the rich text converter
   */
  getRichTextConverter(): RichTextConverter {
    return this.richTextConverter
  }
}

/**
 * Create a Contentful adapter instance
 */
export function createContentfulAdapter(
  config: ContentfulAdapterConfig
): ContentfulAdapter {
  return new ContentfulAdapter(config)
}
