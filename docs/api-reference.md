# API Reference

Complete API reference for ContentBridge core interfaces and types.

## Table of Contents

- [ContentService Interface](#contentservice-interface)
- [QueryBuilder](#querybuilder)
- [MutationBuilder](#mutationbuilder)
- [BaseAdapter](#baseadapter)
- [Type Definitions](#type-definitions)
- [Query Configuration](#query-configuration)
- [Cache Options](#cache-options)

## ContentService Interface

The main interface that all adapters implement.

### Read Operations

#### `getById<T>(id: string, options?: GetOptions<T>): Promise<T | null>`

Get a single document by ID.

```typescript
const post = await adapter.getById<Post>('post-123', {
  resolveReferences: true,
  locale: 'en',
})
```

**Parameters:**
- `id` - Document ID
- `options` - Optional fetch options
  - `resolveReferences?: boolean | number` - Resolve referenced documents (true or depth number)
  - `locale?: string | string[]` - Locale(s) to fetch
  - `cache?: CacheOptions` - Cache configuration

**Returns:** Document or `null` if not found

---

#### `getBySlug<T>(slug: string, type: string, options?: GetOptions<T>): Promise<T | null>`

Get a single document by slug.

```typescript
const post = await adapter.getBySlug<Post>('hello-world', 'post')
```

**Parameters:**
- `slug` - Document slug
- `type` - Document type
- `options` - Optional fetch options

**Returns:** Document or `null` if not found

---

#### `getMany<T>(ids: string[], options?: GetOptions<T>): Promise<T[]>`

Get multiple documents by IDs.

```typescript
const posts = await adapter.getMany<Post>(['post-1', 'post-2', 'post-3'])
```

**Parameters:**
- `ids` - Array of document IDs
- `options` - Optional fetch options

**Returns:** Array of documents

---

#### `getOne<T>(query: QueryConfig<T>, options?: GetOptions<T>): Promise<T | null>`

Get first document matching query.

```typescript
const post = await adapter.getOne<Post>({
  type: 'post',
  filter: [{ field: 'featured', operator: '==', value: true }],
})
```

**Parameters:**
- `query` - Query configuration
- `options` - Optional fetch options

**Returns:** First matching document or `null`

---

#### `count(query: QueryConfig): Promise<number>`

Count documents matching query.

```typescript
const count = await adapter.count({
  type: 'post',
  filter: [{ field: 'status', operator: '==', value: 'published' }],
})
```

**Parameters:**
- `query` - Query configuration (only type and filter used)

**Returns:** Number of matching documents

---

#### `exists(query: QueryConfig): Promise<boolean>`

Check if any documents match query.

```typescript
const hasPublished = await adapter.exists({
  type: 'post',
  filter: [{ field: 'status', operator: '==', value: 'published' }],
})
```

**Parameters:**
- `query` - Query configuration

**Returns:** `true` if at least one document matches

---

### Write Operations

#### `create<T>(type: string, data: Partial<T>, options?: MutationOptions): Promise<T>`

Create a new document.

```typescript
const post = await adapter.create<Post>('post', {
  title: 'Hello World',
  slug: { current: 'hello-world' },
  content: [],
})
```

**Parameters:**
- `type` - Document type
- `data` - Document data (without system fields)
- `options` - Optional mutation options
  - `validate?: boolean` - Validate before creating
  - `publish?: boolean` - Publish immediately
  - `invalidateTags?: string[]` - Cache tags to invalidate

**Returns:** Created document

---

#### `update<T>(id: string, data: Partial<T>, options?: MutationOptions): Promise<T>`

Update an existing document (full replacement).

```typescript
const updated = await adapter.update<Post>('post-123', {
  title: 'Updated Title',
  status: 'published',
})
```

**Parameters:**
- `id` - Document ID
- `data` - Document data
- `options` - Optional mutation options

**Returns:** Updated document

---

#### `patch<T>(id: string, patches: PatchOperation[], options?: MutationOptions): Promise<T>`

Patch specific fields in a document.

```typescript
const patched = await adapter.patch<Post>('post-123', [
  { op: 'set', path: 'title', value: 'New Title' },
  { op: 'inc', path: 'views', value: 1 },
  { op: 'unset', path: 'oldField' },
])
```

**Parameters:**
- `id` - Document ID
- `patches` - Array of patch operations
- `options` - Optional mutation options

**Returns:** Patched document

**Patch Operations:**
- `set` - Set a field value
- `unset` - Remove a field
- `inc` - Increment numeric value
- `dec` - Decrement numeric value
- `insert` - Insert into array
- `append` - Append to array
- `prepend` - Prepend to array

---

#### `delete<T>(id: string, options?: MutationOptions): Promise<T>`

Delete a document.

```typescript
const deleted = await adapter.delete<Post>('post-123')
```

**Parameters:**
- `id` - Document ID
- `options` - Optional mutation options

**Returns:** Deleted document (last known state)

---

#### `transaction(operations: TransactionOperation[]): Promise<TransactionResult>`

Execute multiple mutations atomically.

```typescript
const result = await adapter.transaction([
  { type: 'create', documentType: 'author', data: { name: 'Jane' } },
  { type: 'update', id: 'post-123', data: { author: { _ref: 'author-456' } } },
  { type: 'delete', id: 'old-post-789' },
])

if (result.success) {
  console.log('All operations succeeded')
}
```

**Parameters:**
- `operations` - Array of mutation operations

**Returns:** Transaction result with individual operation results

---

### Utility Methods

#### `query<T>(type: string | string[]): QueryBuilder<T>`

Create a fluent query builder.

```typescript
const query = adapter.query<Post>('post')
  .where('status', '==', 'published')
  .limit(10)
```

**Parameters:**
- `type` - Document type(s) to query

**Returns:** QueryBuilder instance

---

#### `mutate(): MutationBuilder`

Create a fluent mutation builder.

```typescript
const result = await adapter.mutate()
  .create({ _type: 'post', title: 'New Post' })
  .update('post-2', { title: 'Updated' })
  .commit()
```

**Returns:** MutationBuilder instance

---

#### `validate<T>(type: string, data: Partial<T>): Promise<ValidationResult>`

Validate document data against schema.

```typescript
const result = await adapter.validate<Post>('post', {
  title: 'Test',
  slug: { current: 'test' },
})

if (!result.valid) {
  console.error('Validation errors:', result.errors)
}
```

**Parameters:**
- `type` - Document type
- `data` - Data to validate

**Returns:** Validation result

---

#### `invalidateCache(tags: string[]): Promise<void>`

Invalidate cached queries by tags.

```typescript
await adapter.invalidateCache(['posts', 'featured-posts'])
```

**Parameters:**
- `tags` - Cache tags to invalidate

---

#### `reference(id: string, type?: string): DocumentReference`

Create a document reference.

```typescript
const authorRef = adapter.reference('author-123', 'author')

await adapter.create('post', {
  title: 'Post by Author',
  author: authorRef,
})
```

**Parameters:**
- `id` - Referenced document ID
- `type` - Referenced document type (optional)

**Returns:** Document reference object

---

## QueryBuilder

Fluent API for building type-safe queries.

### Filtering Methods

#### `where<K extends keyof T>(field: K, operator: FilterOperator, value: unknown): this`

Add a filter condition.

```typescript
query.where('status', '==', 'published')
  .where('publishedAt', '>', '2024-01-01')
```

**Operators:** `==`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `nin`, `contains`, `containsAny`, `containsAll`, `match`, `startsWith`, `endsWith`, `defined`, `undefined`, `references`

---

#### `equals<K extends keyof T>(field: K, value: unknown): this`

Shorthand for `==` operator.

```typescript
query.equals('status', 'published')
```

---

#### `notEquals<K extends keyof T>(field: K, value: unknown): this`

Shorthand for `!=` operator.

```typescript
query.notEquals('status', 'draft')
```

---

#### `greaterThan<K extends keyof T>(field: K, value: number | string): this`

Shorthand for `>` operator.

```typescript
query.greaterThan('views', 1000)
```

---

#### `greaterThanOrEqual<K extends keyof T>(field: K, value: number | string): this`

Shorthand for `>=` operator.

```typescript
query.greaterThanOrEqual('publishedAt', '2024-01-01')
```

---

#### `lessThan<K extends keyof T>(field: K, value: number | string): this`

Shorthand for `<` operator.

```typescript
query.lessThan('views', 100)
```

---

#### `lessThanOrEqual<K extends keyof T>(field: K, value: number | string): this`

Shorthand for `<=` operator.

```typescript
query.lessThanOrEqual('publishedAt', new Date().toISOString())
```

---

#### `in<K extends keyof T>(field: K, values: unknown[]): this`

Field value must be in array.

```typescript
query.in('status', ['published', 'featured'])
```

---

#### `notIn<K extends keyof T>(field: K, values: unknown[]): this`

Field value must not be in array.

```typescript
query.notIn('status', ['draft', 'archived'])
```

---

#### `contains<K extends keyof T>(field: K, value: unknown): this`

Array field contains value.

```typescript
query.contains('tags', 'javascript')
```

---

#### `containsAny<K extends keyof T>(field: K, values: unknown[]): this`

Array field contains any of the values.

```typescript
query.containsAny('tags', ['javascript', 'typescript'])
```

---

#### `containsAll<K extends keyof T>(field: K, values: unknown[]): this`

Array field contains all values.

```typescript
query.containsAll('tags', ['javascript', 'featured'])
```

---

#### `match<K extends keyof T>(field: K, searchTerm: string): this`

Full-text search on field.

```typescript
query.match('title', 'javascript tutorial')
```

---

#### `startsWith<K extends keyof T>(field: K, prefix: string): this`

String field starts with prefix.

```typescript
query.startsWith('slug', 'blog-')
```

---

#### `endsWith<K extends keyof T>(field: K, suffix: string): this`

String field ends with suffix.

```typescript
query.endsWith('email', '@example.com')
```

---

#### `defined<K extends keyof T>(field: K): this`

Field exists and is not null.

```typescript
query.defined('publishedAt')
```

---

#### `undefined<K extends keyof T>(field: K): this`

Field does not exist or is null.

```typescript
query.undefined('archivedAt')
```

---

#### `references(field: string, id: string): this`

Reference field points to document.

```typescript
query.references('author', 'author-123')
```

---

#### `or(conditions: FilterCondition[]): this`

Add OR condition group.

```typescript
query.or([
  { field: 'featured', operator: '==', value: true },
  { field: 'views', operator: '>', value: 10000 },
])
```

---

### Projection Methods

#### `select(...fields: (keyof T)[]): this`

Select specific fields.

```typescript
query.select('title', 'slug', 'publishedAt')
```

---

#### `project(projection: Projection<T>): this`

Complex field projection.

```typescript
query.project({
  title: true,
  slug: true,
  author: { name: true, image: true },
})
```

---

#### `expand(field: string, projection?: object): this`

Expand referenced document.

```typescript
query.expand('author', { name: true, bio: true })
```

---

### Sorting Methods

#### `orderBy(field: string, direction?: 'asc' | 'desc'): this`

Sort by field.

```typescript
query.orderBy('publishedAt', 'desc')
```

---

#### `sortAsc(field: string): this`

Sort ascending.

```typescript
query.sortAsc('title')
```

---

#### `sortDesc(field: string): this`

Sort descending.

```typescript
query.sortDesc('publishedAt')
```

---

### Pagination Methods

#### `limit(count: number): this`

Maximum results to return.

```typescript
query.limit(10)
```

---

#### `offset(count: number): this`

Number of results to skip.

```typescript
query.offset(20)
```

---

#### `page(pageNumber: number, pageSize: number): this`

Paginate results.

```typescript
query.page(2, 20)  // Page 2, 20 items per page
```

---

#### `cursor(cursorValue: string): this`

Cursor-based pagination.

```typescript
query.cursor('eyJpZCI6IjEyMyJ9')
```

---

### Localization Methods

#### `locale(locale: string, fallback?: string): this`

Set query locale.

```typescript
query.locale('es', 'en')  // Spanish with English fallback
```

---

### Cache Methods

#### `cache(options: CacheOptions): this`

Configure caching.

```typescript
query.cache({ tags: ['posts'], ttl: 3600 })
```

---

#### `tags(...tags: string[]): this`

Set cache tags.

```typescript
query.tags('posts', 'featured')
```

---

#### `ttl(seconds: number): this`

Set cache TTL.

```typescript
query.ttl(3600)  // 1 hour
```

---

#### `noCache(): this`

Disable caching.

```typescript
query.noCache()
```

---

#### `revalidate(interval: number): this`

Set revalidation interval.

```typescript
query.revalidate(60)  // Revalidate every 60 seconds
```

---

### Reference Resolution

#### `resolveReferences(depth: number | boolean): this`

Resolve referenced documents.

```typescript
query.resolveReferences(2)  // Resolve 2 levels deep
```

---

### Execution Methods

#### `getMany(): Promise<QueryResult<T>>`

Execute query and get multiple results.

```typescript
const result = await query.getMany()
console.log(result.data)  // Array of documents
console.log(result.total)  // Total count
```

---

#### `getOne(): Promise<T | null>`

Execute query and get first result.

```typescript
const post = await query.getOne()
```

---

#### `count(): Promise<number>`

Execute query and count results.

```typescript
const count = await query.count()
```

---

#### `toQuery(): QueryConfig<T>`

Get raw query configuration.

```typescript
const config = query.toQuery()
console.log(config)  // QueryConfig object
```

---

## MutationBuilder

Fluent API for building mutation transactions.

### Creation Methods

#### `create(data: Partial<T>): this`

Add create operation.

```typescript
builder.create({ _type: 'post', title: 'New Post' })
```

---

#### `createMany(items: Partial<T>[]): this`

Add multiple create operations.

```typescript
builder.createMany([
  { _type: 'post', title: 'Post 1' },
  { _type: 'post', title: 'Post 2' },
])
```

---

### Update Methods

#### `update(id: string, data: Partial<T>): this`

Add update operation.

```typescript
builder.update('post-123', { title: 'Updated' })
```

---

#### `updateMany(updates: Array<{ id: string; data: Partial<T> }>): this`

Add multiple update operations.

```typescript
builder.updateMany([
  { id: 'post-1', data: { status: 'published' } },
  { id: 'post-2', data: { status: 'published' } },
])
```

---

### Patch Methods

#### `patch(id: string, patches: PatchOperation[]): this`

Add patch operation.

```typescript
builder.patch('post-123', [
  { op: 'set', path: 'title', value: 'New Title' },
])
```

---

#### `patchMany(items: Array<{ id: string; patches: PatchOperation[] }>): this`

Add multiple patch operations.

```typescript
builder.patchMany([
  { id: 'post-1', patches: [{ op: 'set', path: 'featured', value: true }] },
  { id: 'post-2', patches: [{ op: 'inc', path: 'views', value: 1 }] },
])
```

---

### Delete Methods

#### `delete(id: string): this`

Add delete operation.

```typescript
builder.delete('post-123')
```

---

#### `deleteMany(ids: string[]): this`

Add multiple delete operations.

```typescript
builder.deleteMany(['post-1', 'post-2', 'post-3'])
```

---

### Helper Methods

#### `set(id: string, path: string, value: unknown): this`

Set field value.

```typescript
builder.set('post-123', 'title', 'New Title')
```

---

#### `unset(id: string, path: string): this`

Remove field.

```typescript
builder.unset('post-123', 'oldField')
```

---

#### `increment(id: string, path: string, value: number): this`

Increment numeric field.

```typescript
builder.increment('post-123', 'views', 1)
```

---

#### `decrement(id: string, path: string, value: number): this`

Decrement numeric field.

```typescript
builder.decrement('post-123', 'likes', 1)
```

---

#### `append(id: string, path: string, value: unknown): this`

Append to array.

```typescript
builder.append('post-123', 'tags', 'new-tag')
```

---

#### `prepend(id: string, path: string, value: unknown): this`

Prepend to array.

```typescript
builder.prepend('post-123', 'tags', 'first-tag')
```

---

#### `insertAt(id: string, path: string, index: number, value: unknown): this`

Insert at array index.

```typescript
builder.insertAt('post-123', 'tags', 2, 'middle-tag')
```

---

### Configuration Methods

#### `withOptions(options: MutationOptions): this`

Set options for all operations.

```typescript
builder.withOptions({ validate: true, publish: true })
```

---

#### `skipValidation(): this`

Skip validation for mutations.

```typescript
builder.skipValidation()
```

---

#### `autoPublish(): this`

Auto-publish after mutations.

```typescript
builder.autoPublish()
```

---

#### `invalidateTags(...tags: string[]): this`

Invalidate cache tags after mutations.

```typescript
builder.invalidateTags('posts', 'featured')
```

---

### Execution Methods

#### `commit(): Promise<TransactionResult>`

Execute all operations.

```typescript
const result = await builder.commit()

if (result.success) {
  console.log('All operations succeeded')
} else {
  console.error('Transaction failed:', result.errors)
}
```

---

#### `toOperations(): TransactionOperation[]`

Get raw operations array.

```typescript
const operations = builder.toOperations()
```

---

#### `clear(): this`

Clear all operations.

```typescript
builder.clear()
```

---

#### `count(): number`

Get number of operations.

```typescript
const opCount = builder.count()
```

---

## BaseAdapter

Abstract base class for CMS adapters.

### Abstract Methods (Must Implement)

- `compileQuery<T>(config: QueryConfig<T>): Promise<string | object>`
- `executeQuery<T>(config: QueryConfig<T>): Promise<QueryResult<T>>`
- `count(config: QueryConfig): Promise<number>`
- `getById<T>(id: string, options?): Promise<SingleResult<T>>`
- `create<T>(type: string, data): Promise<T>`
- `update<T>(id: string, data): Promise<T>`
- `patch<T>(id: string, patches): Promise<T>`
- `delete<T>(id: string): Promise<T>`
- `transaction(operations): Promise<TransactionResult>`
- `toUniversalRichText(native): Promise<UniversalRichText>`
- `fromUniversalRichText(universal): Promise<unknown>`
- `resolveMediaUrl(asset, options): Promise<string>`
- `getResponsiveImage(asset, options): Promise<ResponsiveImageSet>`
- `getPlaceholder(asset, options): Promise<string>`
- `generateTypes(schemas, options): Promise<GeneratedTypes>`
- `generateZodSchemas(schemas, options): Promise<string>`

### Helper Methods (Optional Override)

- `initialize(): Promise<void>` - Initialize adapter
- `cleanup(): Promise<void>` - Cleanup resources
- `validateConfig(): void` - Validate configuration
- `getInfo(): { name: string; version: string }` - Get adapter info

---

## Type Definitions

### BaseDocument

```typescript
interface BaseDocument {
  _id: string
  _type: string
  _createdAt?: string
  _updatedAt?: string
  _rev?: string
}
```

### DocumentReference

```typescript
interface DocumentReference {
  _ref: string
  _type?: string
  _weak?: boolean
}
```

### Slug

```typescript
interface Slug {
  _type: 'slug'
  current: string
}
```

### FilterOperator

```typescript
type FilterOperator =
  | '==' | '!=' | '>' | '>=' | '<' | '<='
  | 'in' | 'nin'
  | 'contains' | 'containsAny' | 'containsAll'
  | 'match' | 'startsWith' | 'endsWith'
  | 'defined' | 'undefined'
  | 'references'
```

### PatchOperation

```typescript
interface PatchOperation {
  op: 'set' | 'unset' | 'inc' | 'dec' | 'insert' | 'append' | 'prepend'
  path: string
  value?: unknown
  position?: number | 'before' | 'after'
}
```

### TransactionOperation

```typescript
type TransactionOperation =
  | { type: 'create'; documentType: string; data: unknown }
  | { type: 'update'; id: string; data: unknown }
  | { type: 'patch'; id: string; patches: PatchOperation[] }
  | { type: 'delete'; id: string }
```

### TransactionResult

```typescript
interface TransactionResult {
  success: boolean
  results: Array<{ type: string; id: string; data?: unknown }>
  errors?: Array<{ operation: number; message: string; code?: string }>
}
```

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean
  errors?: Array<{
    field: string
    message: string
    code: string
  }>
}
```

---

## Query Configuration

### QueryConfig<T>

```typescript
interface QueryConfig<T = unknown> {
  type: string | string[]
  filter?: FilterCondition[]
  projection?: Projection<T>
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>
  limit?: number
  offset?: number
  cursor?: string
  locale?: string | string[]
  resolveReferences?: boolean | number
  cache?: CacheOptions
}
```

### FilterCondition

```typescript
interface FilterCondition {
  field: string
  operator: FilterOperator
  value: unknown
}
```

### Projection<T>

```typescript
type Projection<T> = {
  [K in keyof T]?: boolean | Projection<T[K]>
}
```

---

## Cache Options

### CacheOptions

```typescript
interface CacheOptions {
  tags?: string[]
  ttl?: number
  revalidate?: number
  enabled?: boolean
}
```

**Properties:**
- `tags` - Cache tags for invalidation
- `ttl` - Time to live in seconds
- `revalidate` - Revalidation interval
- `enabled` - Whether caching is enabled
