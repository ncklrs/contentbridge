# ContentBridge Core - Service Layer Implementation

## Overview

The service layer provides a unified, type-safe API for content operations across different CMS platforms. It abstracts away CMS-specific implementation details through a combination of interfaces and fluent builders.

## Architecture

```
@contentbridge/core
└── service/
    ├── ContentService.ts      - Main service interface
    ├── QueryBuilder.ts        - Fluent query API
    ├── MutationBuilder.ts     - Fluent mutation API
    ├── index.ts              - Public exports
    ├── README.md             - Usage documentation
    └── __tests__/
        └── QueryBuilder.test.ts - Test examples
```

## Files Created

### 1. `ContentService.ts` (455 lines)

Main interface defining the contract that all CMS adapters must implement.

**Key Features:**
- **READ Operations**: `getById`, `getBySlug`, `getMany`, `getOne`, `count`, `exists`
- **WRITE Operations**: `create`, `update`, `patch`, `delete`, `transaction`
- **Fluent API**: `query()`, `mutate()`
- **Utilities**: `validate`, `invalidateCache`, `reference`

**Supporting Types:**
- `GetOptions<T>` - Options for read operations (locale, cache, references)
- `MutationOptions` - Options for write operations (validation, publishing, cache invalidation)
- `PatchOperation` - JSON Patch-style operations (`set`, `unset`, `inc`, `dec`, `insert`)
- `TransactionOperation` - Operations for atomic transactions
- `TransactionResult` - Results of transaction execution
- `ValidationResult` - Document validation results

**Example:**
```typescript
interface ContentService<TDoc extends BaseDocument> {
  getById<T>(id: string, options?: GetOptions<T>): Promise<T | null>
  query<T>(type: string): QueryBuilder<T>
  mutate(): MutationBuilder<TDoc>
  // ... 15+ methods
}
```

### 2. `QueryBuilder.ts` (575 lines)

Fluent API for building type-safe queries. Compiles to `QueryConfig` that adapters can translate.

**Key Features:**
- **Filtering**: 20+ filter methods (`where`, `equals`, `in`, `contains`, `greaterThan`, etc.)
- **Projection**: `select`, `project`, `expand` for field selection
- **Sorting**: `orderBy`, `sortAsc`, `sortDesc`
- **Pagination**: `limit`, `offset`, `cursor`, `page`
- **Localization**: `locale` with fallback support
- **Caching**: `cache`, `tags`, `ttl`, `noCache`, `revalidate`
- **References**: `resolveReferences` with depth control
- **Execution**: `getMany`, `getOne`, `count`, `toQuery`

**Example:**
```typescript
const posts = await service
  .query<Post>('post')
  .where('status', '==', 'published')
  .greaterThan('views', 1000)
  .contains('tags', 'javascript')
  .locale('es', 'en')
  .select('title', 'slug', 'publishedAt')
  .sortDesc('publishedAt')
  .page(1, 20)
  .tags('posts', 'featured')
  .ttl(3600)
  .getMany()
```

### 3. `MutationBuilder.ts` (415 lines)

Fluent API for building mutation transactions. All operations execute atomically.

**Key Features:**
- **CREATE**: `create`, `createMany`
- **UPDATE**: `update`, `updateMany`
- **PATCH**: `patch`, `patchMany`
- **DELETE**: `delete`, `deleteMany`
- **Helpers**: `set`, `unset`, `increment`, `decrement`, `append`, `prepend`, `insertAt`
- **Configuration**: `withOptions`, `skipValidation`, `autoPublish`, `invalidateTags`
- **Execution**: `commit`, `toOperations`, `clear`, `count`

**Example:**
```typescript
const result = await service
  .mutate()
  .create({ _type: 'post', title: 'New Post' })
  .set('post-2', 'title', 'Updated')
  .increment('post-3', 'views', 1)
  .delete('post-4')
  .autoPublish()
  .invalidateTags('posts')
  .commit()
```

### 4. `index.ts` (40 lines)

Central export file for all service types and classes.

**Exports:**
- `ContentService` interface and all supporting types
- `QueryBuilder` class and `QueryExecutor` interface
- `MutationBuilder` class and `MutationExecutor` interface

### 5. `README.md` (900+ lines)

Comprehensive documentation with:
- Quick start guide
- Complete API reference with examples
- Type safety guide
- Best practices
- Adapter implementation guide

### 6. `__tests__/QueryBuilder.test.ts` (420 lines)

Comprehensive test suite demonstrating:
- All filtering operations
- Projection and field selection
- Sorting and pagination
- Localization and caching
- Method chaining
- Builder cloning

## Type Safety

The API is fully type-safe with TypeScript:

```typescript
interface Post extends BaseDocument {
  _type: 'post'
  title: string
  views: number
}

// ✓ Type-safe field names
service.query<Post>('post')
  .where('title', '==', 'Hello')  // Valid
  .where('invalid', '==', 'x')    // TypeScript error

// ✓ Type-safe return types
const posts: QueryResult<Post> = await service
  .query<Post>('post')
  .getMany()

const post: Post | null = await service
  .query<Post>('post')
  .getOne()
```

## Design Decisions

### 1. Fluent API over Config Objects

**Decision**: Provide fluent builder methods instead of raw config objects.

**Rationale**:
- Better developer experience with auto-completion
- Type-safe method chaining
- More discoverable API
- Still allows `toQuery()` for advanced use cases

### 2. Separate Query and Mutation Builders

**Decision**: Split query and mutation into separate builders.

**Rationale**:
- Clear separation of concerns (read vs. write)
- Different method sets prevent confusion
- Mutations are always transactional
- Queries can be optimized independently

### 3. Generic Type Parameters

**Decision**: Use `<T extends BaseDocument>` for all operations.

**Rationale**:
- Full type safety for field names and types
- Better IDE auto-completion
- Compile-time error detection
- Works with generated types from CMS schemas

### 4. QueryConfig as Intermediate Format

**Decision**: Compile fluent API to `QueryConfig`, not directly to CMS query language.

**Rationale**:
- Adapters can optimize for their specific CMS
- Config can be serialized/cached
- Same query works across different CMS platforms
- Easier to test and debug

### 5. Transaction-Based Mutations

**Decision**: All mutations go through transactions by default.

**Rationale**:
- Ensures atomicity (all succeed or all fail)
- Consistent behavior across platforms
- Single network round-trip for multiple operations
- Easier to track and debug changes

### 6. Cache-First Approach

**Decision**: Built-in cache configuration in query API.

**Rationale**:
- Performance is critical for content queries
- Framework-agnostic caching interface
- Tags enable granular invalidation
- Optional - developers can opt-out with `noCache()`

## Usage Examples

### Simple Query

```typescript
const posts = await service
  .query<Post>('post')
  .where('status', '==', 'published')
  .limit(10)
  .getMany()
```

### Complex Query

```typescript
const posts = await service
  .query<Post>('post')
  .or([
    { field: 'featured', operator: '==', value: true },
    { field: 'views', operator: '>', value: 10000 }
  ])
  .locale('es', 'en')
  .expand('author', { name: true, image: true })
  .select('title', 'slug', 'publishedAt', 'author')
  .sortDesc('publishedAt')
  .page(1, 20)
  .tags('posts', 'featured')
  .ttl(3600)
  .getMany()
```

### Simple Mutation

```typescript
const post = await service.create({
  _type: 'post',
  title: 'Hello World',
  slug: { _type: 'slug', current: 'hello-world' }
})
```

### Complex Transaction

```typescript
const result = await service
  .mutate()
  .create({ _type: 'post', title: 'New Post' })
  .update('post-2', { _id: 'post-2', _type: 'post', title: 'Updated' })
  .patch('post-3', [
    { op: 'set', path: 'featured', value: true },
    { op: 'inc', path: 'views', value: 1 }
  ])
  .delete('post-4')
  .autoPublish()
  .invalidateTags('posts', 'featured-posts')
  .commit()
```

## Implementation Status

✅ **Complete:**
- ContentService interface
- QueryBuilder with 25+ methods
- MutationBuilder with 15+ methods
- Full TypeScript type safety
- Comprehensive documentation
- Test examples

🔄 **Next Steps:**
1. Implement adapters (Sanity, Contentful, etc.)
2. Add more tests (MutationBuilder, ContentService)
3. Add validation utilities
4. Add migration helpers
5. Create example applications

## Integration with Existing Types

The service layer integrates seamlessly with existing types:

```typescript
// From types/document.ts
import type { BaseDocument, DocumentReference, Slug } from '../types/document'

// From types/query.ts
import type {
  QueryConfig,
  FilterCondition,
  FilterOperator,
  Projection,
  CacheOptions,
  QueryResult,
  SingleResult
} from '../types/query'

// Service layer builds on these types
export interface ContentService<TDoc extends BaseDocument> {
  query<T extends TDoc>(type: string): QueryBuilder<T>
  // QueryBuilder compiles to QueryConfig<T>
  // QueryConfig is CMS-agnostic
  // Adapters translate QueryConfig to native queries (GROQ, GraphQL, etc.)
}
```

## File Sizes

- `ContentService.ts`: 455 lines, ~15KB
- `QueryBuilder.ts`: 575 lines, ~18KB
- `MutationBuilder.ts`: 415 lines, ~13KB
- `index.ts`: 40 lines, ~1KB
- `README.md`: 900+ lines, ~30KB
- `__tests__/QueryBuilder.test.ts`: 420 lines, ~13KB

**Total**: ~2,800 lines of code and documentation

## Key Strengths

1. **Type Safety**: Full TypeScript support with generics
2. **Developer Experience**: Fluent API with excellent auto-completion
3. **CMS Agnostic**: Works with any headless CMS via adapters
4. **Performance**: Built-in caching with tag-based invalidation
5. **Flexibility**: Raw QueryConfig access for advanced use cases
6. **Documentation**: Extensive examples and API reference
7. **Testing**: Test suite demonstrates usage patterns

## Next: Adapter Implementation

To use the service layer, implement a CMS-specific adapter:

```typescript
class SanityAdapter implements ContentService<BaseDocument> {
  constructor(private client: SanityClient) {}

  async getById<T>(id: string, options?: GetOptions<T>): Promise<T | null> {
    // Use Sanity client to fetch document
    return this.client.getDocument(id)
  }

  query<T>(type: string | string[]): QueryBuilder<T> {
    return new QueryBuilder<T>(type, {
      executeMany: async (config) => {
        // Convert QueryConfig to GROQ query
        const groq = this.configToGroq(config)
        const data = await this.client.fetch(groq)
        return { data }
      },
      // ... other executor methods
    })
  }

  // ... implement other methods
}
```

See `packages/sanity/README.md` for Sanity adapter details.
