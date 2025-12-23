# ContentService API

The service layer provides a unified, type-safe interface for content operations across different CMS platforms.

## Architecture

```
ContentService (interface)
├── QueryBuilder (fluent query API)
├── MutationBuilder (fluent mutation API)
└── Adapters implement the interface
    ├── SanityAdapter
    ├── ContentfulAdapter
    └── ...
```

## Quick Start

```typescript
import { ContentService, QueryBuilder, MutationBuilder } from '@contentbridge/core'

// Adapter-specific implementation
const service: ContentService = new SanityAdapter(config)

// Define your document types
interface Post extends BaseDocument {
  _type: 'post'
  title: string
  slug: Slug
  content: string
  author: DocumentReference<'author'>
  tags: string[]
  publishedAt: string
  views: number
  featured: boolean
}
```

## READ Operations

### Get by ID

```typescript
const post = await service.getById<Post>('post-123')
if (post) {
  console.log(post.title)
}

// With options
const post = await service.getById<Post>('post-123', {
  locale: 'es',
  resolveReferences: true,
  cache: { tags: ['post-123'], ttl: 3600 }
})
```

### Get by Slug

```typescript
const post = await service.getBySlug<Post>('hello-world', 'post')
```

### Query with QueryConfig

```typescript
const post = await service.getOne<Post>({
  type: 'post',
  filter: [
    { field: 'featured', operator: '==', value: true }
  ],
  orderBy: [{ field: 'publishedAt', direction: 'desc' }],
  limit: 1
})
```

### Fluent Query API

```typescript
// Simple query
const posts = await service
  .query<Post>('post')
  .where('status', '==', 'published')
  .orderBy('publishedAt', 'desc')
  .limit(10)
  .getMany()

// Complex filtering
const posts = await service
  .query<Post>('post')
  .where('featured', '==', true)
  .greaterThan('views', 1000)
  .contains('tags', 'javascript')
  .defined('publishedAt')
  .sortDesc('publishedAt')
  .limit(20)
  .getMany()

// With localization
const posts = await service
  .query<Post>('post')
  .locale('es', 'en')
  .where('status', '==', 'published')
  .getMany()

// With caching
const posts = await service
  .query<Post>('post')
  .tags('posts', 'featured')
  .ttl(3600)
  .where('featured', '==', true)
  .getMany()

// With field selection
const posts = await service
  .query<Post>('post')
  .select('title', 'slug', 'publishedAt')
  .where('status', '==', 'published')
  .getMany()

// With reference resolution
const posts = await service
  .query<Post>('post')
  .expand('author', { name: true, image: true })
  .where('status', '==', 'published')
  .getMany()

// Get single result
const post = await service
  .query<Post>('post')
  .where('slug.current', '==', 'hello-world')
  .getOne()

// Count results
const count = await service
  .query<Post>('post')
  .where('status', '==', 'published')
  .count()
```

### Pagination

```typescript
// Offset pagination
const posts = await service
  .query<Post>('post')
  .page(2, 20)  // Page 2, 20 items per page
  .getMany()

// Cursor pagination
const posts = await service
  .query<Post>('post')
  .cursor('eyJpZCI6InBvc3QtMTIzIn0=')
  .limit(20)
  .getMany()
```

### Advanced Queries

```typescript
// OR conditions
const posts = await service
  .query<Post>('post')
  .or([
    { field: 'featured', operator: '==', value: true },
    { field: 'views', operator: '>', value: 10000 }
  ])
  .getMany()

// AND with nested conditions
const posts = await service
  .query<Post>('post')
  .and([
    { field: 'status', operator: '==', value: 'published' },
    {
      or: [
        { field: 'featured', operator: '==', value: true },
        { field: 'tags', operator: 'contains', value: 'important' }
      ]
    }
  ])
  .getMany()

// NOT conditions
const posts = await service
  .query<Post>('post')
  .not({ field: 'status', operator: '==', value: 'draft' })
  .getMany()
```

## WRITE Operations

### Create

```typescript
const post = await service.create<Post>({
  _type: 'post',
  title: 'Hello World',
  slug: { _type: 'slug', current: 'hello-world' },
  content: 'This is my first post',
  tags: ['announcement'],
  publishedAt: new Date().toISOString(),
  views: 0,
  featured: false,
  author: service.reference('author-123', 'author')
})
```

### Update

```typescript
const updated = await service.update<Post>('post-123', {
  _id: 'post-123',
  _type: 'post',
  title: 'Updated Title',
  slug: { _type: 'slug', current: 'updated-title' },
  content: 'Updated content',
  tags: ['announcement', 'update'],
  publishedAt: post.publishedAt,
  views: post.views,
  featured: true,
  author: post.author
})
```

### Patch

```typescript
// Patch with operations
const patched = await service.patch<Post>('post-123', [
  { op: 'set', path: 'title', value: 'New Title' },
  { op: 'inc', path: 'views', value: 1 },
  { op: 'unset', path: 'draft' },
  { op: 'insert', path: 'tags', position: 'after', at: -1, value: 'featured' }
])
```

### Delete

```typescript
await service.delete('post-123')
```

### Transactions

```typescript
const result = await service.transaction([
  {
    type: 'create',
    document: {
      _type: 'post',
      title: 'Post 1',
      slug: { _type: 'slug', current: 'post-1' }
    }
  },
  {
    type: 'update',
    id: 'post-2',
    document: {
      _id: 'post-2',
      _type: 'post',
      title: 'Updated Post 2'
    }
  },
  {
    type: 'patch',
    id: 'post-3',
    operations: [
      { op: 'inc', path: 'views', value: 1 }
    ]
  },
  {
    type: 'delete',
    id: 'post-4'
  }
])

console.log(result.results)  // Array of operation results
```

## Fluent Mutation API

```typescript
// Single mutation
const result = await service
  .mutate()
  .create<Post>({
    _type: 'post',
    title: 'New Post',
    slug: { _type: 'slug', current: 'new-post' }
  })
  .commit()

// Multiple mutations
const result = await service
  .mutate()
  .create<Post>({
    _type: 'post',
    title: 'Post 1',
    slug: { _type: 'slug', current: 'post-1' }
  })
  .update('post-2', {
    _id: 'post-2',
    _type: 'post',
    title: 'Updated'
  })
  .delete('post-3')
  .commit()

// With options
const result = await service
  .mutate()
  .autoPublish()
  .invalidateTags('posts', 'featured-posts')
  .create<Post>({
    _type: 'post',
    title: 'New Post',
    slug: { _type: 'slug', current: 'new-post' }
  })
  .commit()

// Patch helpers
const result = await service
  .mutate()
  .set('post-123', 'title', 'New Title')
  .increment('post-123', 'views', 1)
  .append('post-123', 'tags', 'featured')
  .commit()

// Batch operations
const result = await service
  .mutate()
  .createMany([
    { _type: 'post', title: 'Post 1' },
    { _type: 'post', title: 'Post 2' },
    { _type: 'post', title: 'Post 3' }
  ])
  .commit()
```

## Utilities

### Validation

```typescript
const result = await service.validate<Post>({
  _type: 'post',
  title: '',  // Invalid: required field empty
  slug: { _type: 'slug', current: 'hello-world' }
})

if (!result.valid) {
  console.error('Validation errors:', result.errors)
  // [{ path: 'title', message: 'Title is required', rule: 'required' }]
}
```

### Cache Invalidation

```typescript
await service.invalidateCache(['post-123', 'tag:posts', 'tag:featured'])
```

### References

```typescript
const authorRef = service.reference('author-123', 'author')
// Returns: { _ref: 'author-123', _type: 'reference', _targetType: 'author' }

const weakRef = service.reference('optional-123', 'optional', true)
// Returns: { _ref: 'optional-123', _type: 'reference', _weak: true }
```

## Type Safety

The API is fully type-safe when used with TypeScript:

```typescript
interface Post extends BaseDocument {
  _type: 'post'
  title: string
  slug: Slug
  views: number
}

// Type-safe field names
service.query<Post>('post')
  .where('title', '==', 'Hello')  // ✓ Valid
  .where('invalid', '==', 'x')    // ✗ TypeScript error

// Type-safe operators
service.query<Post>('post')
  .greaterThan('views', 100)      // ✓ Valid
  .greaterThan('title', 100)      // ✗ TypeScript error (title is string)

// Type-safe return types
const posts: QueryResult<Post> = await service
  .query<Post>('post')
  .getMany()

const post: Post | null = await service
  .query<Post>('post')
  .getOne()
```

## Best Practices

### 1. Use the Fluent API

Prefer the fluent query builder over raw QueryConfig:

```typescript
// ✓ Preferred
const posts = await service
  .query<Post>('post')
  .where('status', '==', 'published')
  .limit(10)
  .getMany()

// ✗ Avoid (less readable)
const posts = await service.getOne<Post>({
  type: 'post',
  filter: [{ field: 'status', operator: '==', value: 'published' }],
  limit: 10
})
```

### 2. Add Cache Tags

Always tag queries for efficient cache invalidation:

```typescript
const posts = await service
  .query<Post>('post')
  .tags('posts', 'published-posts')
  .where('status', '==', 'published')
  .getMany()

// Later, invalidate when posts change
await service.invalidateCache(['tag:posts'])
```

### 3. Use Transactions for Related Changes

```typescript
// ✓ Atomic transaction
await service
  .mutate()
  .create({ _type: 'post', title: 'New Post' })
  .increment('stats-1', 'postCount', 1)
  .commit()

// ✗ Separate operations (not atomic)
await service.create({ _type: 'post', title: 'New Post' })
await service.patch('stats-1', [{ op: 'inc', path: 'postCount', value: 1 }])
```

### 4. Handle Errors

```typescript
try {
  const result = await service
    .mutate()
    .create({ _type: 'post', title: 'New Post' })
    .commit()
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.errors)
  } else {
    console.error('Mutation failed:', error)
  }
}
```

### 5. Optimize Queries

```typescript
// Select only needed fields
const posts = await service
  .query<Post>('post')
  .select('title', 'slug', 'publishedAt')
  .limit(100)
  .getMany()

// Use pagination
const posts = await service
  .query<Post>('post')
  .page(1, 20)
  .getMany()
```

## Implementing an Adapter

To create a custom adapter, implement the `ContentService` interface:

```typescript
import { ContentService, QueryBuilder, MutationBuilder } from '@contentbridge/core'

class MyAdapter implements ContentService {
  async getById<T>(id: string, options?: GetOptions<T>): Promise<T | null> {
    // Implement using your CMS API
  }

  query<T>(type: string | string[]): QueryBuilder<T> {
    return new QueryBuilder<T>(type, {
      executeMany: async (config) => {
        // Convert config to your CMS query format
        // Execute query
        // Return results
      },
      executeOne: async (config) => {
        // Similar to executeMany but return single result
      },
      executeCount: async (config) => {
        // Count query
      }
    })
  }

  // Implement all other methods...
}
```

## Related Documentation

- [Type Definitions](../types/README.md)
- [Query Configuration](../types/query.ts)
- [Document Types](../types/document.ts)
