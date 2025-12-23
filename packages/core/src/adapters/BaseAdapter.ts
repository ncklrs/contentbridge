/**
 * BaseAdapter - Abstract base class for all CMS adapters
 *
 * This class defines the contract that all CMS adapters must implement.
 * It provides a unified interface for querying, mutating, and managing
 * content across different headless CMS platforms.
 *
 * @example
 * ```typescript
 * class SanityAdapter extends BaseAdapter {
 *   name = 'sanity'
 *   version = '1.0.0'
 *
 *   async compileQuery(config: QueryConfig): Promise<string> {
 *     // Convert QueryConfig to GROQ
 *     return `*[_type == "${config.type}"]`
 *   }
 *
 *   // ... implement other abstract methods
 * }
 * ```
 */

import type {
  BaseDocument,
  DocumentSchema,
  DocumentReference,
} from '../types/document'
import type {
  QueryConfig,
  QueryResult,
  SingleResult,
} from '../types/query'
import type { RichTextContent } from '../types/richtext'
import type {
  MediaAsset,
  PlaceholderType,
} from '../types/media'
import type { Logger } from '../utils/logger'
import { createChildLogger } from '../utils/logger'

// Import transaction types from service layer to avoid duplication
import type {
  TransactionOperation,
  TransactionResult,
} from '../service/ContentService'

// Re-export types that adapters commonly need
export type { UniversalBlock, RichTextContent } from '../types/richtext'
export type { MediaAsset, ImageTransform, ResponsiveImage, PlaceholderType } from '../types/media'

// ============================================================================
// Adapter Configuration
// ============================================================================

/**
 * Base configuration required for all adapters
 */
export interface AdapterConfig {
  /**
   * Adapter-specific configuration options
   * This allows each adapter to define its own connection settings
   */
  [key: string]: unknown

  /**
   * Optional logger instance
   * If not provided, a default logger will be created
   */
  logger?: Logger

  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean
}

// Note: Transaction types are imported from service layer above
// to maintain a single source of truth and avoid duplication

// ============================================================================
// Adapter-Specific Types
// ============================================================================

/**
 * Universal rich text wrapper for adapter conversion
 * Adapters convert their native formats to/from this structure
 */
export interface UniversalRichText {
  _type: 'richtext'
  content: RichTextContent
}

/**
 * Responsive image options for adapter generation
 */
export interface ResponsiveImageOptions {
  widths: number[]
  formats?: ('webp' | 'avif' | 'png' | 'jpg')[]
  quality?: number
}

/**
 * Responsive image set returned by adapters
 */
export interface ResponsiveImageSet {
  src: string
  srcset: string
  sources: Array<{
    srcset: string
    type?: string
    sizes?: string
  }>
  width: number
  height: number
  aspectRatio: number
  alt?: string
  lqip?: string
}

/**
 * Image placeholder options
 */
export interface PlaceholderOptions {
  type: PlaceholderType
  width?: number
  quality?: number
}

// ============================================================================
// Type Generation Types
// ============================================================================

/**
 * Generated TypeScript type information
 */
export interface GeneratedTypes {
  /**
   * TypeScript interface definitions
   */
  interfaces: string

  /**
   * Zod schema definitions
   */
  schemas?: string

  /**
   * Type exports
   */
  exports: string

  /**
   * Import statements needed
   */
  imports: string[]
}

/**
 * Type generation options
 */
export interface TypeGenerationOptions {
  /**
   * Output format
   * @default 'typescript'
   */
  format?: 'typescript' | 'zod' | 'both'

  /**
   * Include documentation comments
   * @default true
   */
  includeDocumentation?: boolean

  /**
   * Generate strict types (no optional fields unless explicitly marked)
   * @default true
   */
  strict?: boolean

  /**
   * Include utility types
   * @default true
   */
  includeHelpers?: boolean

  /**
   * Custom type mappings
   */
  customMappings?: Record<string, string>
}

// ============================================================================
// Base Adapter Abstract Class
// ============================================================================

/**
 * Abstract base adapter class
 *
 * All CMS adapters must extend this class and implement all abstract methods.
 * This ensures a consistent interface across different CMS platforms.
 */
export abstract class BaseAdapter<TConfig extends AdapterConfig = AdapterConfig> {
  /**
   * Adapter name (e.g., 'sanity', 'contentful', 'payload')
   */
  abstract readonly name: string

  /**
   * Adapter version
   */
  abstract readonly version: string

  /**
   * Adapter configuration
   */
  protected readonly config: TConfig

  /**
   * Logger instance
   */
  protected readonly logger: Logger

  constructor(config: TConfig) {
    this.config = config
    // Note: this.name is not available yet (abstract property)
    // Subclasses should call super() and then set up logger if needed
    this.logger = config.logger ?? createChildLogger('adapter')

    if (config.debug) {
      this.logger = this.logger.withLevel('debug')
    }
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  /**
   * Compile a QueryConfig to the adapter's native query format
   *
   * @param config - Universal query configuration
   * @returns Native query string or object (e.g., GROQ string, GraphQL query, REST params)
   *
   * @example
   * ```typescript
   * // Sanity adapter compiles to GROQ
   * const groq = await adapter.compileQuery({
   *   type: 'post',
   *   filter: [{ field: 'status', operator: '==', value: 'published' }],
   *   limit: 10
   * })
   * // Returns: "*[_type == 'post' && status == 'published'][0...10]"
   * ```
   */
  abstract compileQuery<T = unknown>(config: QueryConfig<T>): Promise<string | object>

  /**
   * Execute a query and return results
   *
   * @param config - Query configuration
   * @returns Query results with metadata
   *
   * @example
   * ```typescript
   * const result = await adapter.executeQuery<Post>({
   *   type: 'post',
   *   filter: [{ field: 'featured', operator: '==', value: true }],
   *   limit: 5
   * })
   * console.log(result.data) // Array of Post documents
   * console.log(result.total) // Total matching documents
   * ```
   */
  abstract executeQuery<T extends BaseDocument>(
    config: QueryConfig<T>
  ): Promise<QueryResult<T>>

  /**
   * Get total count of documents matching query
   *
   * @param config - Query configuration (only type and filter are used)
   * @returns Total count
   *
   * @example
   * ```typescript
   * const count = await adapter.count({
   *   type: 'post',
   *   filter: [{ field: 'status', operator: '==', value: 'published' }]
   * })
   * console.log(`${count} published posts`)
   * ```
   */
  abstract count(config: QueryConfig): Promise<number>

  /**
   * Get a single document by ID
   *
   * @param id - Document ID
   * @param options - Optional fetch options
   * @returns Single document result
   *
   * @example
   * ```typescript
   * const result = await adapter.getById<Post>('post-123', {
   *   resolveReferences: true
   * })
   * if (result.data) {
   *   console.log(result.data.title)
   * }
   * ```
   */
  abstract getById<T extends BaseDocument>(
    id: string,
    options?: {
      resolveReferences?: boolean | number
      includeDrafts?: boolean
    }
  ): Promise<SingleResult<T>>

  // ==========================================================================
  // Mutation Methods
  // ==========================================================================

  /**
   * Create a new document
   *
   * @param documentType - Type of document to create
   * @param data - Document data
   * @returns Created document
   *
   * @example
   * ```typescript
   * const post = await adapter.create<Post>('post', {
   *   title: 'Hello World',
   *   slug: { current: 'hello-world' },
   *   body: [...]
   * })
   * console.log(post._id)
   * ```
   */
  abstract create<T extends BaseDocument>(
    documentType: string,
    data: Omit<T, '_id' | '_type' | '_createdAt' | '_updatedAt' | '_rev'>
  ): Promise<T>

  /**
   * Update an existing document (full replacement)
   *
   * @param id - Document ID
   * @param data - Complete document data
   * @returns Updated document
   *
   * @example
   * ```typescript
   * const updated = await adapter.update<Post>('post-123', {
   *   title: 'Updated Title',
   *   slug: { current: 'updated-title' },
   *   body: [...]
   * })
   * ```
   */
  abstract update<T extends BaseDocument>(
    id: string,
    data: Partial<Omit<T, '_id' | '_type' | '_createdAt' | '_updatedAt' | '_rev'>>
  ): Promise<T>

  /**
   * Patch an existing document (partial update)
   *
   * @param id - Document ID
   * @param patches - Array of patch operations
   * @returns Patched document
   *
   * @example
   * ```typescript
   * const patched = await adapter.patch<Post>('post-123', [
   *   { op: 'set', path: 'title', value: 'New Title' },
   *   { op: 'unset', path: 'oldField' }
   * ])
   * ```
   */
  abstract patch<T extends BaseDocument>(
    id: string,
    patches: Array<{
      op: 'set' | 'unset' | 'insert' | 'replace'
      path: string
      value?: unknown
    }>
  ): Promise<T>

  /**
   * Delete a document
   *
   * @param id - Document ID
   * @returns Deleted document (last known state)
   *
   * @example
   * ```typescript
   * const deleted = await adapter.delete('post-123')
   * console.log(`Deleted: ${deleted.title}`)
   * ```
   */
  abstract delete<T extends BaseDocument>(id: string): Promise<T>

  /**
   * Execute multiple mutations as a transaction
   *
   * @param operations - Array of mutation operations
   * @returns Transaction result with individual operation results
   *
   * @example
   * ```typescript
   * const result = await adapter.transaction([
   *   { type: 'create', documentType: 'author', data: { name: 'John' } },
   *   { type: 'update', id: 'post-123', data: { author: { _ref: 'author-456' } } }
   * ])
   * if (result.success) {
   *   console.log('All operations succeeded')
   * }
   * ```
   */
  abstract transaction(operations: TransactionOperation[]): Promise<TransactionResult>

  // ==========================================================================
  // Rich Text Methods
  // ==========================================================================

  /**
   * Convert adapter's native rich text format to universal format
   *
   * @param nativeContent - Rich text in adapter's native format
   * @returns Universal rich text structure
   *
   * @example
   * ```typescript
   * const universal = await adapter.toUniversalRichText(sanityPortableText)
   * // Can now be used with any rendering library
   * ```
   */
  abstract toUniversalRichText(nativeContent: unknown): Promise<UniversalRichText>

  /**
   * Convert universal rich text format to adapter's native format
   *
   * @param universalContent - Universal rich text structure
   * @returns Rich text in adapter's native format
   *
   * @example
   * ```typescript
   * const sanityContent = await adapter.fromUniversalRichText(universal)
   * await adapter.create('post', { body: sanityContent })
   * ```
   */
  abstract fromUniversalRichText(universalContent: UniversalRichText): Promise<unknown>

  // ==========================================================================
  // Media Methods
  // ==========================================================================

  /**
   * Resolve a media asset reference to a full URL
   *
   * @param assetRef - Asset reference or ID
   * @param options - URL generation options
   * @returns Full asset URL
   *
   * @example
   * ```typescript
   * const url = await adapter.resolveMediaUrl(image, {
   *   width: 800,
   *   format: 'webp',
   *   quality: 80
   * })
   * ```
   */
  abstract resolveMediaUrl(
    assetRef: string | DocumentReference | MediaAsset,
    options?: {
      width?: number
      height?: number
      format?: 'webp' | 'avif' | 'png' | 'jpg'
      quality?: number
      fit?: 'crop' | 'fill' | 'fillmax' | 'max' | 'scale' | 'clip' | 'min'
      [key: string]: unknown
    }
  ): Promise<string>

  /**
   * Generate a responsive image set with multiple sizes
   *
   * @param assetRef - Asset reference or ID
   * @param options - Responsive image options
   * @returns Responsive image set with srcset
   *
   * @example
   * ```typescript
   * const imageSet = await adapter.getResponsiveImage(image, {
   *   widths: [400, 800, 1200],
   *   formats: ['webp', 'jpg']
   * })
   * ```
   */
  abstract getResponsiveImage(
    assetRef: string | DocumentReference | MediaAsset,
    options: ResponsiveImageOptions
  ): Promise<ResponsiveImageSet>

  /**
   * Get a placeholder for progressive image loading
   *
   * @param assetRef - Asset reference or ID
   * @param options - Placeholder options
   * @returns Placeholder data (base64 image, blurhash, or color)
   *
   * @example
   * ```typescript
   * const lqip = await adapter.getPlaceholder(image, {
   *   type: 'lqip',
   *   width: 20
   * })
   * ```
   */
  abstract getPlaceholder(
    assetRef: string | DocumentReference | MediaAsset,
    options: PlaceholderOptions
  ): Promise<string>

  // ==========================================================================
  // Type Generation Methods
  // ==========================================================================

  /**
   * Generate TypeScript types from CMS schemas
   *
   * @param schemas - Document schemas to generate types for
   * @param options - Type generation options
   * @returns Generated TypeScript code
   *
   * @example
   * ```typescript
   * const schemas = await adapter.getSchemas()
   * const types = await adapter.generateTypes(schemas, {
   *   format: 'typescript',
   *   strict: true
   * })
   * // Write to file: types.generated.ts
   * ```
   */
  abstract generateTypes(
    schemas: DocumentSchema[],
    options?: TypeGenerationOptions
  ): Promise<GeneratedTypes>

  /**
   * Generate Zod schemas from CMS schemas
   *
   * @param schemas - Document schemas to generate Zod schemas for
   * @param options - Generation options
   * @returns Generated Zod schema code
   *
   * @example
   * ```typescript
   * const schemas = await adapter.getSchemas()
   * const zodSchemas = await adapter.generateZodSchemas(schemas)
   * // Use for runtime validation
   * ```
   */
  abstract generateZodSchemas(
    schemas: DocumentSchema[],
    options?: TypeGenerationOptions
  ): Promise<string>

  // ==========================================================================
  // Helper Methods (can be overridden)
  // ==========================================================================

  /**
   * Get adapter information
   */
  getInfo(): { name: string; version: string } {
    return {
      name: this.name,
      version: this.version,
    }
  }

  /**
   * Validate configuration (can be overridden for custom validation)
   */
  protected validateConfig(): void {
    // Override in subclass for custom validation
  }

  /**
   * Initialize adapter (called after construction, can be overridden)
   */
  async initialize(): Promise<void> {
    this.validateConfig()
    this.logger.info(`Initialized ${this.name} adapter v${this.version}`)
  }

  /**
   * Cleanup adapter resources (can be overridden)
   */
  async cleanup(): Promise<void> {
    this.logger.info(`Cleaning up ${this.name} adapter`)
  }
}
