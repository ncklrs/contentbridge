/**
 * MutationBuilder - Fluent API for building mutations
 *
 * Provides a chainable interface for constructing mutation transactions.
 * All operations are batched and executed atomically when commit() is called.
 */

import type { BaseDocument } from '../types/document'
import type {
  PatchOperation,
  TransactionOperation,
  TransactionResult,
  MutationOptions,
} from './ContentService'

/**
 * Fluent mutation builder
 *
 * @example
 * ```typescript
 * const result = await mutationBuilder
 *   .create({ _type: 'post', title: 'New Post' })
 *   .update('post-2', { title: 'Updated Title' })
 *   .patch('post-3', [{ op: 'inc', path: 'views', value: 1 }])
 *   .delete('post-4')
 *   .commit()
 * ```
 */
export class MutationBuilder<TDoc extends BaseDocument = BaseDocument> {
  private operations: TransactionOperation[] = []
  private options: MutationOptions = {}

  /**
   * Execute function for running the compiled mutation
   * Provided by the ContentService implementation
   */
  private executor: MutationExecutor<TDoc>

  constructor(executor: MutationExecutor<TDoc>, initialOptions?: MutationOptions) {
    this.executor = executor
    if (initialOptions) {
      this.options = { ...initialOptions }
    }
  }

  // ==========================================================================
  // CREATE
  // ==========================================================================

  /**
   * Add a create operation
   *
   * @example
   * ```typescript
   * .create({
   *   _type: 'post',
   *   title: 'Hello World',
   *   slug: { _type: 'slug', current: 'hello-world' }
   * })
   * ```
   */
  create<T extends TDoc = TDoc>(
    document: Omit<T, '_id' | '_createdAt' | '_updatedAt' | '_rev'>,
    id?: string
  ): this {
    this.operations.push({
      type: 'create',
      document,
      id,
    })
    return this
  }

  /**
   * Create multiple documents
   *
   * @example
   * ```typescript
   * .createMany([
   *   { _type: 'post', title: 'Post 1' },
   *   { _type: 'post', title: 'Post 2' },
   * ])
   * ```
   */
  createMany<T extends TDoc = TDoc>(
    documents: Array<Omit<T, '_id' | '_createdAt' | '_updatedAt' | '_rev'>>
  ): this {
    documents.forEach((doc) => {
      this.operations.push({
        type: 'create',
        document: doc,
      })
    })
    return this
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  /**
   * Add an update operation (full replacement)
   *
   * @example
   * ```typescript
   * .update('post-123', {
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
    ifRevision?: string
  ): this {
    this.operations.push({
      type: 'update',
      id,
      document,
      ifRevision,
    })
    return this
  }

  /**
   * Update multiple documents
   *
   * @example
   * ```typescript
   * .updateMany([
   *   { id: 'post-1', document: { _id: 'post-1', _type: 'post', title: 'New Title 1' } },
   *   { id: 'post-2', document: { _id: 'post-2', _type: 'post', title: 'New Title 2' } },
   * ])
   * ```
   */
  updateMany<T extends TDoc = TDoc>(
    updates: Array<{
      id: string
      document: Partial<T> & { _id: string; _type: string }
      ifRevision?: string
    }>
  ): this {
    updates.forEach(({ id, document, ifRevision }) => {
      this.operations.push({
        type: 'update',
        id,
        document,
        ifRevision,
      })
    })
    return this
  }

  // ==========================================================================
  // PATCH
  // ==========================================================================

  /**
   * Add a patch operation
   *
   * @example
   * ```typescript
   * .patch('post-123', [
   *   { op: 'set', path: 'title', value: 'New Title' },
   *   { op: 'inc', path: 'views', value: 1 },
   *   { op: 'unset', path: 'draft' }
   * ])
   * ```
   */
  patch(id: string, operations: PatchOperation[], ifRevision?: string): this {
    this.operations.push({
      type: 'patch',
      id,
      operations,
      ifRevision,
    })
    return this
  }

  /**
   * Patch multiple documents
   *
   * @example
   * ```typescript
   * .patchMany([
   *   { id: 'post-1', operations: [{ op: 'inc', path: 'views', value: 1 }] },
   *   { id: 'post-2', operations: [{ op: 'inc', path: 'views', value: 1 }] },
   * ])
   * ```
   */
  patchMany(
    patches: Array<{
      id: string
      operations: PatchOperation[]
      ifRevision?: string
    }>
  ): this {
    patches.forEach(({ id, operations, ifRevision }) => {
      this.operations.push({
        type: 'patch',
        id,
        operations,
        ifRevision,
      })
    })
    return this
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  /**
   * Add a delete operation
   *
   * @example
   * ```typescript
   * .delete('post-123')
   * ```
   */
  delete(id: string, ifRevision?: string): this {
    this.operations.push({
      type: 'delete',
      id,
      ifRevision,
    })
    return this
  }

  /**
   * Delete multiple documents
   *
   * @example
   * ```typescript
   * .deleteMany(['post-1', 'post-2', 'post-3'])
   * ```
   */
  deleteMany(ids: string[], ifRevision?: string): this {
    ids.forEach((id) => {
      this.operations.push({
        type: 'delete',
        id,
        ifRevision,
      })
    })
    return this
  }

  // ==========================================================================
  // PATCH HELPERS (Convenience methods for common patch operations)
  // ==========================================================================

  /**
   * Set a field value
   *
   * @example
   * ```typescript
   * .set('post-123', 'title', 'New Title')
   * ```
   */
  set(id: string, path: string, value: unknown, ifRevision?: string): this {
    return this.patch(id, [{ op: 'set', path, value }], ifRevision)
  }

  /**
   * Unset/remove a field
   *
   * @example
   * ```typescript
   * .unset('post-123', 'draft')
   * ```
   */
  unset(id: string, path: string, ifRevision?: string): this {
    return this.patch(id, [{ op: 'unset', path }], ifRevision)
  }

  /**
   * Increment a numeric field
   *
   * @example
   * ```typescript
   * .increment('post-123', 'views', 1)
   * ```
   */
  increment(id: string, path: string, value = 1, ifRevision?: string): this {
    return this.patch(id, [{ op: 'inc', path, value }], ifRevision)
  }

  /**
   * Decrement a numeric field
   *
   * @example
   * ```typescript
   * .decrement('post-123', 'stock', 1)
   * ```
   */
  decrement(id: string, path: string, value = 1, ifRevision?: string): this {
    return this.patch(id, [{ op: 'dec', path, value }], ifRevision)
  }

  /**
   * Set a field only if it doesn't exist
   *
   * @example
   * ```typescript
   * .setIfMissing('post-123', 'createdBy', 'user-456')
   * ```
   */
  setIfMissing(id: string, path: string, value: unknown, ifRevision?: string): this {
    return this.patch(id, [{ op: 'setIfMissing', path, value }], ifRevision)
  }

  /**
   * Append to an array
   *
   * @example
   * ```typescript
   * .append('post-123', 'tags', 'featured')
   * ```
   */
  append(id: string, path: string, value: unknown, ifRevision?: string): this {
    return this.patch(
      id,
      [{ op: 'insert', path, position: 'after', at: -1, value }],
      ifRevision
    )
  }

  /**
   * Prepend to an array
   *
   * @example
   * ```typescript
   * .prepend('post-123', 'tags', 'breaking')
   * ```
   */
  prepend(id: string, path: string, value: unknown, ifRevision?: string): this {
    return this.patch(
      id,
      [{ op: 'insert', path, position: 'before', at: 0, value }],
      ifRevision
    )
  }

  /**
   * Insert into an array at a specific position
   *
   * @example
   * ```typescript
   * .insertAt('post-123', 'tags', 2, 'important')
   * ```
   */
  insertAt(
    id: string,
    path: string,
    index: number,
    value: unknown,
    ifRevision?: string
  ): this {
    return this.patch(
      id,
      [{ op: 'insert', path, position: 'before', at: index, value }],
      ifRevision
    )
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Set mutation options
   *
   * @example
   * ```typescript
   * .withOptions({
   *   autoPublish: true,
   *   invalidateTags: ['posts']
   * })
   * ```
   */
  withOptions(options: MutationOptions): this {
    this.options = { ...this.options, ...options }
    return this
  }

  /**
   * Skip validation for all mutations
   *
   * @example
   * ```typescript
   * .skipValidation()
   * ```
   */
  skipValidation(): this {
    this.options.skipValidation = true
    return this
  }

  /**
   * Auto-publish after mutations (if CMS supports drafts)
   *
   * @example
   * ```typescript
   * .autoPublish()
   * ```
   */
  autoPublish(): this {
    this.options.autoPublish = true
    return this
  }

  /**
   * Invalidate specific cache tags after mutations
   *
   * @example
   * ```typescript
   * .invalidateTags('posts', 'featured-posts')
   * ```
   */
  invalidateTags(...tags: string[]): this {
    this.options.invalidateTags = [
      ...(this.options.invalidateTags || []),
      ...tags,
    ]
    return this
  }

  // ==========================================================================
  // EXECUTION
  // ==========================================================================

  /**
   * Execute all mutations as a transaction
   * All operations succeed or all fail
   *
   * @example
   * ```typescript
   * const result = await builder
   *   .create({ _type: 'post', title: 'New' })
   *   .update('post-2', { title: 'Updated' })
   *   .delete('post-3')
   *   .commit()
   * ```
   */
  async commit(): Promise<TransactionResult> {
    if (this.operations.length === 0) {
      throw new Error('No operations to commit')
    }

    return this.executor.executeTransaction(this.operations, this.options)
  }

  /**
   * Get the list of operations without executing
   * Useful for debugging or previewing mutations
   *
   * @example
   * ```typescript
   * const ops = builder
   *   .create({ _type: 'post', title: 'New' })
   *   .delete('post-2')
   *   .toOperations()
   * console.log(ops)
   * ```
   */
  toOperations(): TransactionOperation[] {
    return [...this.operations]
  }

  /**
   * Clear all operations
   *
   * @example
   * ```typescript
   * builder.create({ _type: 'post', title: 'Test' })
   * builder.clear()  // Remove all operations
   * ```
   */
  clear(): this {
    this.operations = []
    return this
  }

  /**
   * Get the number of operations
   *
   * @example
   * ```typescript
   * const count = builder
   *   .create({ _type: 'post', title: 'New' })
   *   .delete('post-2')
   *   .count()  // Returns 2
   * ```
   */
  count(): number {
    return this.operations.length
  }

  /**
   * Clone the builder with current operations
   * Useful for creating variations
   *
   * @example
   * ```typescript
   * const baseBuilder = builder.create({ _type: 'post', title: 'Base' })
   * const variant1 = baseBuilder.clone().set('post-1', 'featured', true)
   * const variant2 = baseBuilder.clone().set('post-2', 'featured', true)
   * ```
   */
  clone(): MutationBuilder<TDoc> {
    const cloned = new MutationBuilder<TDoc>(this.executor, { ...this.options })
    cloned.operations = [...this.operations]
    return cloned
  }
}

// ============================================================================
// Executor Interface
// ============================================================================

/**
 * Interface for executing mutations
 * Implemented by ContentService adapters
 */
export interface MutationExecutor<_TDoc extends BaseDocument = BaseDocument> {
  /**
   * Execute a transaction of mutation operations
   */
  executeTransaction(
    operations: TransactionOperation[],
    options: MutationOptions
  ): Promise<TransactionResult>
}
