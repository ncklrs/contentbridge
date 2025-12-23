/**
 * ContentService - Main interface for content operations
 *
 * Provides a unified API for CRUD operations across different CMS platforms.
 * Adapters implement this interface to provide CMS-specific functionality.
 */

import type {
  BaseDocument,
  DocumentReference,
} from '../types/document'
import type {
  QueryConfig,
} from '../types/query'

// Note: Fluent API (QueryBuilder, MutationBuilder) is available separately
// but not exposed through ContentService to keep the interface focused
// on direct CRUD operations. Use QueryBuilder directly for fluent queries.

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Core content service interface
 * All CMS adapters must implement this interface
 *
 * @template TDoc - The base document type (defaults to BaseDocument)
 */
export interface ContentService<TDoc extends BaseDocument = BaseDocument> {
  // --------------------------------------------------------------------------
  // READ Operations
  // --------------------------------------------------------------------------

  /**
   * Get a single document by ID
   *
   * @example
   * ```typescript
   * const post = await service.getById<Post>('post-123')
   * if (post) {
   *   console.log(post.title)
   * }
   * ```
   */
  getById<T extends TDoc = TDoc>(
    id: string,
    options?: GetOptions<T>
  ): Promise<T | null>

  /**
   * Get a single document by slug
   *
   * @example
   * ```typescript
   * const post = await service.getBySlug<Post>('hello-world', 'post')
   * ```
   */
  getBySlug<T extends TDoc = TDoc>(
    slug: string,
    type: string,
    options?: GetOptions<T>
  ): Promise<T | null>

  /**
   * Get multiple documents by IDs
   *
   * @example
   * ```typescript
   * const posts = await service.getMany<Post>(['post-1', 'post-2'])
   * ```
   */
  getMany<T extends TDoc = TDoc>(
    ids: string[],
    options?: GetOptions<T>
  ): Promise<T[]>

  /**
   * Get one document matching a query config
   *
   * @example
   * ```typescript
   * const post = await service.getOne<Post>({
   *   type: 'post',
   *   filter: [{ field: 'featured', operator: '==', value: true }]
   * })
   * ```
   */
  getOne<T extends TDoc = TDoc>(
    query: QueryConfig<T>,
    options?: GetOptions<T>
  ): Promise<T | null>

  /**
   * Count documents matching a query
   *
   * @example
   * ```typescript
   * const count = await service.count({
   *   type: 'post',
   *   filter: [{ field: 'status', operator: '==', value: 'published' }]
   * })
   * ```
   */
  count(query: QueryConfig): Promise<number>

  /**
   * Check if a document exists
   *
   * @example
   * ```typescript
   * const exists = await service.exists('post-123')
   * ```
   */
  exists(id: string): Promise<boolean>

  // --------------------------------------------------------------------------
  // WRITE Operations
  // --------------------------------------------------------------------------

  /**
   * Create a new document
   *
   * @example
   * ```typescript
   * const post = await service.create<Post>({
   *   _type: 'post',
   *   title: 'Hello World',
   *   slug: { _type: 'slug', current: 'hello-world' }
   * })
   * ```
   */
  create<T extends TDoc = TDoc>(
    document: Omit<T, '_id' | '_createdAt' | '_updatedAt' | '_rev'>,
    options?: MutationOptions
  ): Promise<T>

  /**
   * Update an existing document (full replacement)
   *
   * @example
   * ```typescript
   * const updated = await service.update<Post>('post-123', {
   *   _id: 'post-123',
   *   _type: 'post',
   *   title: 'Updated Title',
   *   slug: { _type: 'slug', current: 'updated-title' }
   * })
   * ```
   */
  update<T extends TDoc = TDoc>(
    id: string,
    document: Partial<T> & { _id: string; _type: string },
    options?: MutationOptions
  ): Promise<T>

  /**
   * Patch a document with specific operations
   *
   * @example
   * ```typescript
   * const patched = await service.patch<Post>('post-123', [
   *   { op: 'set', path: 'title', value: 'New Title' },
   *   { op: 'unset', path: 'draft' },
   *   { op: 'inc', path: 'views', value: 1 }
   * ])
   * ```
   */
  patch<T extends TDoc = TDoc>(
    id: string,
    operations: PatchOperation[],
    options?: MutationOptions
  ): Promise<T>

  /**
   * Delete a document
   *
   * @example
   * ```typescript
   * await service.delete('post-123')
   * ```
   */
  delete(id: string, options?: MutationOptions): Promise<void>

  /**
   * Execute multiple operations in a transaction
   * All operations succeed or all fail
   *
   * @example
   * ```typescript
   * const result = await service.transaction([
   *   { type: 'create', document: { _type: 'post', title: 'Post 1' } },
   *   { type: 'update', id: 'post-2', document: { title: 'Updated' } },
   *   { type: 'delete', id: 'post-3' }
   * ])
   * ```
   */
  transaction(
    operations: TransactionOperation[],
    options?: MutationOptions
  ): Promise<TransactionResult>

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  /**
   * Validate a document against schema rules
   *
   * @example
   * ```typescript
   * const result = await service.validate({
   *   _type: 'post',
   *   title: '', // Invalid: required
   * })
   * if (!result.valid) {
   *   console.error(result.errors)
   * }
   * ```
   */
  validate<T extends TDoc = TDoc>(
    document: Partial<T>
  ): Promise<ValidationResult>

  /**
   * Invalidate cache for specific tags or IDs
   *
   * @example
   * ```typescript
   * await service.invalidateCache(['post-123', 'tag:posts'])
   * ```
   */
  invalidateCache(tagsOrIds: string[]): Promise<void>

  /**
   * Create a document reference
   *
   * @example
   * ```typescript
   * const authorRef = service.reference('author-123', 'author')
   * // Returns: { _ref: 'author-123', _type: 'reference', _targetType: 'author' }
   * ```
   */
  reference<TTargetType extends string = string>(
    id: string,
    targetType?: TTargetType,
    weak?: boolean
  ): DocumentReference<TTargetType>
}

// ============================================================================
// Options Types
// ============================================================================

/**
 * Options for GET operations
 */
export interface GetOptions<T = unknown> {
  /**
   * Language/locale for localized content
   * @example 'en', 'es', 'fr'
   */
  locale?: string

  /**
   * Fallback locale if primary not available
   */
  fallbackLocale?: string

  /**
   * Include draft/unpublished documents
   * @default false
   */
  includeDrafts?: boolean

  /**
   * Resolve references to the specified depth
   * - true: resolve 1 level deep
   * - number: resolve to specific depth
   * - false: don't resolve (return raw references)
   * @default false
   */
  resolveReferences?: boolean | number

  /**
   * Specific fields to project/select
   * If not provided, returns all fields
   */
  projection?: Partial<Record<keyof T, boolean>>

  /**
   * Cache configuration
   */
  cache?: {
    /** Cache tags for invalidation */
    tags?: string[]
    /** TTL in seconds */
    ttl?: number
    /** Skip cache */
    noCache?: boolean
  }

  /**
   * CMS-specific options
   */
  adapterOptions?: Record<string, unknown>
}

/**
 * Options for mutation operations
 */
export interface MutationOptions {
  /**
   * Skip validation before applying mutation
   * @default false
   */
  skipValidation?: boolean

  /**
   * Auto-publish after mutation (if CMS supports drafts)
   * @default false
   */
  autoPublish?: boolean

  /**
   * Cache tags to invalidate after mutation
   */
  invalidateTags?: string[]

  /**
   * Optimistic locking: only update if _rev matches
   */
  ifRevision?: string

  /**
   * Return the full document after mutation
   * @default true
   */
  returnDocument?: boolean

  /**
   * CMS-specific options
   */
  adapterOptions?: Record<string, unknown>
}

// ============================================================================
// Patch Operations
// ============================================================================

/**
 * JSON Patch-style operations for document mutations
 *
 * @example
 * ```typescript
 * // Set a field
 * { op: 'set', path: 'title', value: 'New Title' }
 *
 * // Unset a field
 * { op: 'unset', path: 'draft' }
 *
 * // Increment a number
 * { op: 'inc', path: 'views', value: 1 }
 *
 * // Decrement a number
 * { op: 'dec', path: 'stock', value: 1 }
 *
 * // Set if field is missing
 * { op: 'setIfMissing', path: 'createdBy', value: 'user-123' }
 *
 * // Insert into array at position
 * { op: 'insert', path: 'tags', position: 'before', value: 'featured', at: 0 }
 *
 * // Append to array
 * { op: 'insert', path: 'tags', position: 'after', value: 'new-tag', at: -1 }
 *
 * // Remove array item at index
 * { op: 'unset', path: 'tags[2]' }
 *
 * // Remove array item by value
 * { op: 'unset', path: 'tags[@ == "old-tag"]' }
 * ```
 */
export type PatchOperation =
  | SetOperation
  | UnsetOperation
  | IncrementOperation
  | DecrementOperation
  | SetIfMissingOperation
  | InsertOperation

export interface SetOperation {
  op: 'set'
  /** Field path (supports dot notation and array indexing) */
  path: string
  value: unknown
}

export interface UnsetOperation {
  op: 'unset'
  /** Field path (supports dot notation and array indexing) */
  path: string
}

export interface IncrementOperation {
  op: 'inc'
  path: string
  value: number
}

export interface DecrementOperation {
  op: 'dec'
  path: string
  value: number
}

export interface SetIfMissingOperation {
  op: 'setIfMissing'
  path: string
  value: unknown
}

export interface InsertOperation {
  op: 'insert'
  path: string
  position: 'before' | 'after'
  /** Index to insert at (-1 for end) */
  at: number
  value: unknown
}

// ============================================================================
// Transaction Types
// ============================================================================

/**
 * Operations that can be part of a transaction
 */
export type TransactionOperation =
  | CreateOperation
  | UpdateOperation
  | PatchOperationBatch
  | DeleteOperation

export interface CreateOperation {
  type: 'create'
  document: Omit<BaseDocument, '_id' | '_createdAt' | '_updatedAt' | '_rev'>
  /** Optional ID to assign (if supported by CMS) */
  id?: string
}

export interface UpdateOperation {
  type: 'update'
  id: string
  document: Partial<BaseDocument> & { _id: string; _type: string }
  /** Optimistic locking */
  ifRevision?: string
}

export interface PatchOperationBatch {
  type: 'patch'
  id: string
  operations: PatchOperation[]
  /** Optimistic locking */
  ifRevision?: string
}

export interface DeleteOperation {
  type: 'delete'
  id: string
  /** Optimistic locking */
  ifRevision?: string
}

/**
 * Result of a transaction execution
 */
export interface TransactionResult {
  /** Successfully executed operations */
  results: Array<{
    operation: TransactionOperation
    result: BaseDocument | null
  }>

  /** Total execution time in ms */
  timing?: number

  /** Transaction ID (if supported by CMS) */
  transactionId?: string
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Result of document validation
 */
export interface ValidationResult {
  /** Whether the document is valid */
  valid: boolean

  /** Validation errors (if invalid) */
  errors?: ValidationError[]

  /** Validation warnings (non-blocking) */
  warnings?: ValidationWarning[]
}

export interface ValidationError {
  /** Field path that failed validation */
  path: string

  /** Error message */
  message: string

  /** Validation rule that failed */
  rule: string

  /** Expected value/format */
  expected?: unknown

  /** Actual value */
  actual?: unknown
}

export interface ValidationWarning {
  /** Field path */
  path: string

  /** Warning message */
  message: string

  /** Warning type */
  type: 'deprecation' | 'best-practice' | 'performance' | 'other'
}
