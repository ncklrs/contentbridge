/**
 * Test mocks and stubs for ContentBridge tests
 *
 * Provides reusable mock implementations of adapters, executors,
 * and other components for testing.
 */

import type { BaseDocument, DocumentReference } from '../types/document'
import type {
  QueryConfig,
  QueryResult,
  SingleResult,
} from '../types/query'
import type {
  ContentService,
  TransactionOperation,
  TransactionResult,
  PatchOperation,
  ValidationResult,
  GetOptions,
  MutationOptions,
} from '../service/ContentService'
import type { QueryExecutor } from '../service/QueryBuilder'
import type { MutationExecutor } from '../service/MutationBuilder'

/**
 * Mock ContentService implementation for testing
 */
export class MockContentService<TDoc extends BaseDocument = BaseDocument>
  implements ContentService<TDoc>
{
  // Storage for tracking calls
  public calls: {
    method: string
    args: unknown[]
  }[] = []

  // Mock data storage
  public documents = new Map<string, TDoc>()

  // Track method calls
  private trackCall(method: string, ...args: unknown[]): void {
    this.calls.push({ method, args })
  }

  // Clear all tracked calls and documents
  public reset(): void {
    this.calls = []
    this.documents.clear()
  }

  // Seed mock documents
  public seed(documents: TDoc[]): void {
    documents.forEach((doc) => {
      this.documents.set(doc._id, doc)
    })
  }

  async getById<T extends TDoc = TDoc>(
    id: string,
    _options?: GetOptions<T>
  ): Promise<T | null> {
    this.trackCall('getById', id, _options)
    return (this.documents.get(id) as T) ?? null
  }

  async getBySlug<T extends TDoc = TDoc>(
    slug: string,
    type: string,
    _options?: GetOptions<T>
  ): Promise<T | null> {
    this.trackCall('getBySlug', slug, type, _options)
    const doc = Array.from(this.documents.values()).find(
      (d) =>
        d._type === type &&
        'slug' in d &&
        typeof d.slug === 'object' &&
        d.slug !== null &&
        'current' in d.slug &&
        d.slug.current === slug
    )
    return (doc as T) ?? null
  }

  async getMany<T extends TDoc = TDoc>(
    ids: string[],
    _options?: GetOptions<T>
  ): Promise<T[]> {
    this.trackCall('getMany', ids, _options)
    return ids
      .map((id) => this.documents.get(id) as T)
      .filter((doc): doc is T => doc !== undefined)
  }

  async getOne<T extends TDoc = TDoc>(
    _query: QueryConfig<T>,
    _options?: GetOptions<T>
  ): Promise<T | null> {
    this.trackCall('getOne', _query, _options)
    const docs = Array.from(this.documents.values()) as T[]
    return docs[0] ?? null
  }

  async count(_query: QueryConfig): Promise<number> {
    this.trackCall('count', _query)
    return this.documents.size
  }

  async exists(id: string): Promise<boolean> {
    this.trackCall('exists', id)
    return this.documents.has(id)
  }

  async create<T extends TDoc = TDoc>(
    document: Omit<T, '_id' | '_createdAt' | '_updatedAt' | '_rev'>,
    _options?: MutationOptions
  ): Promise<T> {
    this.trackCall('create', document, _options)
    const newDoc = {
      ...document,
      _id: `${document._type}-${Math.random().toString(36).substr(2, 9)}`,
      _createdAt: new Date().toISOString(),
      _updatedAt: new Date().toISOString(),
    } as T
    this.documents.set(newDoc._id, newDoc)
    return newDoc
  }

  async update<T extends TDoc = TDoc>(
    id: string,
    document: Partial<T> & { _id: string; _type: string },
    _options?: MutationOptions
  ): Promise<T> {
    this.trackCall('update', id, document, _options)
    const existing = this.documents.get(id)
    if (!existing) {
      throw new Error(`Document ${id} not found`)
    }
    const updated = {
      ...existing,
      ...document,
      _updatedAt: new Date().toISOString(),
    } as T
    this.documents.set(id, updated)
    return updated
  }

  async patch<T extends TDoc = TDoc>(
    id: string,
    _operations: PatchOperation[],
    _options?: MutationOptions
  ): Promise<T> {
    this.trackCall('patch', id, _operations, _options)
    const existing = this.documents.get(id)
    if (!existing) {
      throw new Error(`Document ${id} not found`)
    }
    // Simplified patch implementation for testing
    const patched = {
      ...existing,
      _updatedAt: new Date().toISOString(),
    } as T
    this.documents.set(id, patched)
    return patched
  }

  async delete(id: string, _options?: MutationOptions): Promise<void> {
    this.trackCall('delete', id, _options)
    this.documents.delete(id)
  }

  async transaction(
    operations: TransactionOperation[],
    _options?: MutationOptions
  ): Promise<TransactionResult> {
    this.trackCall('transaction', operations, _options)
    const results = operations.map((op) => ({
      operation: op,
      result: null as BaseDocument | null,
    }))
    return { results }
  }

  async validate<T extends TDoc = TDoc>(
    _document: Partial<T>
  ): Promise<ValidationResult> {
    this.trackCall('validate', _document)
    return { valid: true }
  }

  async invalidateCache(_tagsOrIds: string[]): Promise<void> {
    this.trackCall('invalidateCache', _tagsOrIds)
  }

  reference<TTargetType extends string = string>(
    id: string,
    targetType?: TTargetType,
    weak?: boolean
  ): DocumentReference<TTargetType> {
    this.trackCall('reference', id, targetType, weak)
    return {
      _ref: id,
      _type: 'reference',
      ...(targetType && { _targetType: targetType }),
      ...(weak && { _weak: weak }),
    }
  }

  // Helper to get last call for a method
  public getLastCall(method: string): unknown[] | undefined {
    const calls = this.calls.filter((c) => c.method === method)
    return calls[calls.length - 1]?.args
  }

  // Helper to count calls for a method
  public getCallCount(method: string): number {
    return this.calls.filter((c) => c.method === method).length
  }
}

/**
 * Mock QueryExecutor for testing QueryBuilder
 */
export class MockQueryExecutor<TDoc extends BaseDocument = BaseDocument>
  implements QueryExecutor<TDoc>
{
  public lastConfig: QueryConfig<TDoc> | null = null
  public mockResults: QueryResult<TDoc> = {
    data: [],
    total: 0,
    hasMore: false,
  }

  async executeMany(config: QueryConfig<TDoc>): Promise<QueryResult<TDoc>> {
    this.lastConfig = config
    return this.mockResults
  }

  async executeOne(config: QueryConfig<TDoc>): Promise<SingleResult<TDoc>> {
    this.lastConfig = config
    return {
      data: this.mockResults.data[0] ?? null,
    }
  }

  async executeCount(config: QueryConfig): Promise<number> {
    this.lastConfig = config
    return this.mockResults.total ?? 0
  }

  // Helper to set mock results
  public setResults(data: TDoc[], total?: number): void {
    this.mockResults = {
      data,
      total: total ?? data.length,
      hasMore: false,
    }
  }

  // Helper to reset
  public reset(): void {
    this.lastConfig = null
    this.mockResults = {
      data: [],
      total: 0,
      hasMore: false,
    }
  }
}

/**
 * Mock MutationExecutor for testing MutationBuilder
 */
export class MockMutationExecutor<TDoc extends BaseDocument = BaseDocument>
  implements MutationExecutor<TDoc>
{
  public lastOperations: TransactionOperation[] | null = null
  public lastOptions: MutationOptions | null = null
  public mockResult: TransactionResult = {
    results: [],
  }

  async executeTransaction(
    operations: TransactionOperation[],
    options: MutationOptions
  ): Promise<TransactionResult> {
    this.lastOperations = operations
    this.lastOptions = options
    return this.mockResult
  }

  // Helper to set mock result
  public setResult(result: TransactionResult): void {
    this.mockResult = result
  }

  // Helper to reset
  public reset(): void {
    this.lastOperations = null
    this.lastOptions = null
    this.mockResult = {
      results: [],
    }
  }
}
