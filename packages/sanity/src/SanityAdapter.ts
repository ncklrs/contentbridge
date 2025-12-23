/**
 * Sanity CMS Adapter
 *
 * Implements ContentService interface for Sanity CMS
 * Provides unified API for content operations using GROQ queries
 */

import type { SanityClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'
import type {
  BaseDocument,
  DocumentReference,
  ContentService,
  QueryConfig,
  GetOptions,
  MutationOptions,
  PatchOperation,
  TransactionOperation,
  TransactionResult,
  ValidationResult,
} from '@contentbridge/core'

import { QueryCompiler, type GROQCompilerConfig } from './groq/QueryCompiler'
import { PortableTextConverter } from './richtext/PortableTextConverter'

/**
 * Sanity adapter configuration
 */
export interface SanityAdapterConfig {
  /**
   * Sanity project ID
   */
  projectId: string

  /**
   * Dataset name
   */
  dataset: string

  /**
   * API version (YYYY-MM-DD format)
   * @default '2024-01-01'
   */
  apiVersion?: string

  /**
   * API token for authenticated requests
   */
  token?: string

  /**
   * Use CDN for read operations
   * @default true
   */
  useCdn?: boolean

  /**
   * Perspective for queries
   * @default 'published'
   */
  perspective?: 'published' | 'previewDrafts' | 'raw'

  /**
   * GROQ compiler configuration
   */
  groqConfig?: GROQCompilerConfig
}

/**
 * Sanity CMS Adapter
 * Implements ContentService for Sanity
 */
export class SanityAdapter<TDoc extends BaseDocument = BaseDocument>
  implements ContentService<TDoc>
{
  private client: SanityClient
  private compiler: QueryCompiler
  private portableText: PortableTextConverter
  private imageBuilder: ReturnType<typeof imageUrlBuilder>
  private config: Required<Omit<SanityAdapterConfig, 'token'>> & Pick<SanityAdapterConfig, 'token'>

  constructor(client: SanityClient, config: SanityAdapterConfig) {
    this.client = client
    this.config = {
      apiVersion: '2024-01-01',
      useCdn: true,
      perspective: 'published',
      groqConfig: {},
      ...config,
    }

    // Initialize utilities
    this.compiler = new QueryCompiler(this.config.groqConfig)
    this.portableText = new PortableTextConverter()
    this.imageBuilder = imageUrlBuilder(client)
  }

  // ==========================================================================
  // READ Operations
  // ==========================================================================

  async getById<T extends TDoc = TDoc>(
    id: string,
    options?: GetOptions<T>
  ): Promise<T | null> {
    try {
      const query = `*[_id == $id][0]`
      const params = { id }

      const result = await this.client.fetch<T>(query, params, {
        perspective: this.getPerspective(options),
      })

      return result || null
    } catch (error) {
      console.error(`Error fetching document by ID: ${id}`, error)
      return null
    }
  }

  async getBySlug<T extends TDoc = TDoc>(
    slug: string,
    docType: string,
    options?: GetOptions<T>
  ): Promise<T | null> {
    try {
      const query = `*[_type == $type && slug.current == $slug][0]`
      const params = { type: docType, slug }

      const result = await this.client.fetch<T>(query, params, {
        perspective: this.getPerspective(options),
      })

      return result || null
    } catch (error) {
      console.error(`Error fetching document by slug: ${slug}`, error)
      return null
    }
  }

  async getMany<T extends TDoc = TDoc>(
    ids: string[],
    options?: GetOptions<T>
  ): Promise<T[]> {
    try {
      const query = `*[_id in $ids]`
      const params = { ids }

      const results = await this.client.fetch<T[]>(query, params, {
        perspective: this.getPerspective(options),
      })

      return results || []
    } catch (error) {
      console.error('Error fetching multiple documents', error)
      return []
    }
  }

  async getOne<T extends TDoc = TDoc>(
    queryConfig: QueryConfig<T>,
    options?: GetOptions<T>
  ): Promise<T | null> {
    try {
      // Compile query with limit 1
      const compiled = this.compiler.compile({ ...queryConfig, limit: 1 })

      const result = await this.client.fetch<T[]>(
        compiled.query,
        compiled.params,
        {
          perspective: this.getPerspective(options),
        }
      )

      return result?.[0] || null
    } catch (error) {
      console.error('Error fetching single document', error)
      return null
    }
  }

  async count(queryConfig: QueryConfig): Promise<number> {
    try {
      // Build count query
      const baseQuery = this.compiler.compile(queryConfig)

      // Extract filter part and create count query
      const filterMatch = baseQuery.query.match(/\*\[(.*?)\]/)
      const filter = filterMatch ? filterMatch[1] : ''

      const countQuery = filter
        ? `count(*[${filter}])`
        : 'count(*)'

      const result = await this.client.fetch<number>(
        countQuery,
        baseQuery.params
      )

      return result || 0
    } catch (error) {
      console.error('Error counting documents', error)
      return 0
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const query = `defined(*[_id == $id][0]._id)`
      const result = await this.client.fetch<boolean>(query, { id })
      return result
    } catch (error) {
      console.error(`Error checking document existence: ${id}`, error)
      return false
    }
  }

  // ==========================================================================
  // WRITE Operations
  // ==========================================================================

  async create<T extends TDoc = TDoc>(
    document: Omit<T, '_id' | '_createdAt' | '_updatedAt' | '_rev'>,
    _options?: MutationOptions
  ): Promise<T> {
    try {
      const result = await this.client.create(document as T)

      return result as T
    } catch (error) {
      console.error('Error creating document', error)
      throw error
    }
  }

  async update<T extends TDoc = TDoc>(
    id: string,
    document: Partial<T> & { _id: string; _type: string },
    _options?: MutationOptions
  ): Promise<T> {
    try {
      // Ensure document has the correct ID
      const docWithId = { ...document, _id: id }

      const result = await this.client
        .patch(id)
        .set(docWithId)
        .commit()

      return result as T
    } catch (error) {
      console.error(`Error updating document: ${id}`, error)
      throw error
    }
  }

  async patch<T extends TDoc = TDoc>(
    id: string,
    operations: PatchOperation[],
    _options?: MutationOptions
  ): Promise<T> {
    try {
      let patchBuilder = this.client.patch(id)

      // Apply operations
      for (const op of operations) {
        patchBuilder = this.applyPatchOperation(patchBuilder, op)
      }

      const result = await patchBuilder.commit()

      return result as T
    } catch (error) {
      console.error(`Error patching document: ${id}`, error)
      throw error
    }
  }

  async delete(id: string, _options?: MutationOptions): Promise<void> {
    try {
      await this.client.delete(id)
    } catch (error) {
      console.error(`Error deleting document: ${id}`, error)
      throw error
    }
  }

  async transaction(
    operations: TransactionOperation[],
    _options?: MutationOptions
  ): Promise<TransactionResult> {
    try {
      const txn = this.client.transaction()

      // Build transaction operations
      for (const op of operations) {
        switch (op.type) {
          case 'create':
            txn.create(op.document as BaseDocument)
            break

          case 'update':
            txn.patch(op.id, (patch) => patch.set(op.document))
            break

          case 'patch':
            // eslint-disable-next-line no-case-declarations
            let patchOp = txn.patch(op.id)
            for (const patchOperation of op.operations) {
              // Type assertion needed because Transaction.patch and Client.patch return different types
              // We need to cast through unknown to satisfy TypeScript
              patchOp = this.applyPatchOperation(patchOp as unknown as ReturnType<SanityClient['patch']>, patchOperation) as unknown as typeof patchOp
            }
            break

          case 'delete':
            txn.delete(op.id)
            break
        }
      }

      // Commit transaction
      const results = await txn.commit()

      // Convert results to array if needed and map to expected format
      const resultsArray = Array.isArray(results) ? results : (results.results || [])

      return {
        results: operations.map((op, index) => ({
          operation: op,
          result: resultsArray[index] as BaseDocument,
        })),
      }
    } catch (error) {
      console.error('Error executing transaction', error)
      throw error
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  async validate<T extends TDoc = TDoc>(
    _document: Partial<T>
  ): Promise<ValidationResult> {
    // Sanity doesn't provide built-in validation API
    // Schema validation should be handled by Sanity Studio or custom Zod schemas
    // Return warnings to inform the user
    return {
      valid: true,
      errors: [],
      warnings: [{
        path: '',
        message: 'Sanity adapter does not provide runtime validation. Use Sanity Studio validation rules or Zod schemas for runtime validation.',
        type: 'other',
      }],
    }
  }

  async invalidateCache(_tagsOrIds: string[]): Promise<void> {
    // Sanity CDN cache is managed automatically by Sanity
    // For Next.js integration, use revalidateTag() from next/cache
    // This method is a no-op for Sanity - cache invalidation happens automatically
    // when mutations are made through the Sanity client
  }

  reference<TTargetType extends string = string>(
    id: string,
    targetType?: TTargetType,
    weak?: boolean
  ): DocumentReference<TTargetType> {
    return {
      _ref: id,
      _type: 'reference',
      _weak: weak,
      _targetType: targetType,
    }
  }

  // ==========================================================================
  // HELPER Methods
  // ==========================================================================

  /**
   * Get perspective for query based on options
   */
  private getPerspective(
    options?: GetOptions<unknown>
  ): 'published' | 'previewDrafts' | 'raw' {
    if (options?.includeDrafts) {
      return 'previewDrafts'
    }

    return this.config.perspective
  }

  /**
   * Apply a patch operation to a patch builder
   */
  private applyPatchOperation(
    patch: ReturnType<SanityClient['patch']>,
    operation: PatchOperation
  ): ReturnType<SanityClient['patch']> {
    switch (operation.op) {
      case 'set':
        return patch.set({ [operation.path]: operation.value })

      case 'unset':
        return patch.unset([operation.path])

      case 'inc':
        return patch.inc({ [operation.path]: operation.value })

      case 'dec':
        return patch.dec({ [operation.path]: operation.value })

      case 'setIfMissing':
        return patch.setIfMissing({ [operation.path]: operation.value })

      case 'insert':
        if (operation.position === 'after') {
          return patch.insert(
            operation.position,
            operation.path,
            [operation.value]
          )
        } else {
          return patch.insert(
            operation.position,
            operation.path,
            [operation.value]
          )
        }

      default:
        console.warn(`Unknown patch operation: ${(operation as PatchOperation).op}`)
        return patch
    }
  }

  /**
   * Get image URL builder for asset references
   */
  getImageUrl(asset: { _ref: string } | string): ReturnType<typeof imageUrlBuilder> {
    const ref = typeof asset === 'string' ? asset : asset._ref
    return this.imageBuilder.image(ref)
  }

  /**
   * Get the underlying Sanity client
   * Use this for advanced operations not covered by the adapter
   */
  getClient(): SanityClient {
    return this.client
  }

  /**
   * Get the GROQ compiler instance
   */
  getCompiler(): QueryCompiler {
    return this.compiler
  }

  /**
   * Get the Portable Text converter
   */
  getPortableTextConverter(): PortableTextConverter {
    return this.portableText
  }
}

/**
 * Create a Sanity adapter instance
 */
export function createSanityAdapter<TDoc extends BaseDocument = BaseDocument>(
  client: SanityClient,
  config: SanityAdapterConfig
): SanityAdapter<TDoc> {
  return new SanityAdapter<TDoc>(client, config)
}
