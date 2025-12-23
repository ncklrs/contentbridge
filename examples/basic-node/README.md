# ContentBridge Basic Node.js Example

A simple Node.js application demonstrating **all ContentBridge CRUD operations** without any framework dependencies.

## What This Example Shows

This is the **simplest way** to use ContentBridge. Perfect for:

- **Learning**: See all ContentBridge features in one place
- **CLI tools**: Build content management CLIs
- **Scripts**: Automate content operations
- **Microservices**: Lightweight content services
- **Testing**: Prototype CMS integrations

## Features Demonstrated

- ✅ **CREATE** - Creating new documents
- ✅ **READ** - Querying, filtering, sorting, fetching by ID/slug
- ✅ **UPDATE** - Full updates and partial patches
- ✅ **DELETE** - Removing documents
- ✅ **TRANSACTIONS** - Atomic multi-document operations
- ✅ **VALIDATION** - Document validation
- ✅ **REFERENCES** - Creating document references
- ✅ **CACHE INVALIDATION** - Clearing caches
- ✅ **ADAPTER SWITCHING** - Swap CMSs via environment variable

## Setup

### 1. Install Dependencies

From the monorepo root:

```bash
pnpm install
```

### 2. Configure Environment

Choose your CMS and configure credentials:

```bash
cd examples/basic-node
cp .env.example .env
```

**For Sanity:**

```env
CMS_ADAPTER=sanity
SANITY_PROJECT_ID=your_project_id
SANITY_DATASET=production
SANITY_API_TOKEN=your_api_token
```

**For Contentful:**

```env
CMS_ADAPTER=contentful
CONTENTFUL_SPACE_ID=your_space_id
CONTENTFUL_ENVIRONMENT=master
CONTENTFUL_ACCESS_TOKEN=your_access_token
```

### 3. Run the Example

```bash
# Run main demo (all operations)
pnpm start

# Watch mode (auto-reload on changes)
pnpm dev
```

## Project Structure

```
examples/basic-node/
├── src/
│   ├── content.ts           # ContentBridge setup with adapter switching
│   ├── index.ts             # Main demo showing all operations
│   └── examples/            # Individual operation examples
│       ├── create.ts        # CREATE operations
│       ├── query.ts         # READ/Query operations
│       ├── update.ts        # UPDATE operations
│       ├── delete.ts        # DELETE operations
│       └── transaction.ts   # TRANSACTION operations
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Usage Examples

### CREATE - Creating Documents

```typescript
import { content } from './content.js'

const post = await content.create({
  _type: 'post',
  title: 'Hello World',
  slug: { _type: 'slug', current: 'hello-world' },
  status: 'draft',
  tags: ['tutorial'],
})

console.log('Created:', post._id)
```

### READ - Querying Documents

**Using QueryBuilder (recommended):**

```typescript
const posts = await content
  .query()
  .type('post')
  .filter('status', '==', 'published')
  .orderBy('publishedAt', 'desc')
  .limit(10)
  .execute()
```

**Using query config:**

```typescript
const posts = await content.query({
  type: 'post',
  filter: [
    { field: 'status', operator: '==', value: 'published' },
    { field: 'featured', operator: '==', value: true },
  ],
  sort: [{ field: 'publishedAt', direction: 'desc' }],
  limit: 10,
})
```

**Get by ID:**

```typescript
const post = await content.getById('post-123')
```

**Get by slug:**

```typescript
const post = await content.getBySlug('hello-world', 'post')
```

**Get multiple by IDs:**

```typescript
const posts = await content.getMany(['post-1', 'post-2', 'post-3'])
```

**Count documents:**

```typescript
const count = await content.count({
  type: 'post',
  filter: [{ field: 'status', operator: '==', value: 'published' }],
})
```

**Check existence:**

```typescript
const exists = await content.exists('post-123')
```

### UPDATE - Updating Documents

**Full update (replace):**

```typescript
const updated = await content.update('post-123', {
  _id: 'post-123',
  _type: 'post',
  title: 'Updated Title',
  slug: { _type: 'slug', current: 'updated-title' },
  status: 'published',
})
```

**Partial update (patch):**

```typescript
const patched = await content.patch('post-123', [
  { op: 'set', path: 'title', value: 'New Title' },
  { op: 'inc', path: 'views', value: 1 },
  { op: 'unset', path: 'draft' },
  { op: 'insert', path: 'tags', position: 'after', at: -1, value: 'featured' },
])
```

**Patch operations:**

```typescript
// Set a field
{ op: 'set', path: 'title', value: 'New Title' }

// Unset (remove) a field
{ op: 'unset', path: 'draft' }

// Increment a number
{ op: 'inc', path: 'views', value: 1 }

// Decrement a number
{ op: 'dec', path: 'stock', value: 1 }

// Set if missing (only if field doesn't exist)
{ op: 'setIfMissing', path: 'createdBy', value: 'user-123' }

// Insert into array
{ op: 'insert', path: 'tags', position: 'after', at: -1, value: 'new-tag' }
```

### DELETE - Removing Documents

```typescript
await content.delete('post-123')
```

### TRANSACTIONS - Atomic Operations

Execute multiple operations atomically (all succeed or all fail):

```typescript
const result = await content.transaction([
  // Create a new post
  {
    type: 'create',
    document: {
      _type: 'post',
      title: 'New Post',
      slug: { _type: 'slug', current: 'new-post' },
    },
  },

  // Update existing post
  {
    type: 'update',
    id: 'post-123',
    document: {
      _id: 'post-123',
      _type: 'post',
      title: 'Updated',
    },
  },

  // Patch another post
  {
    type: 'patch',
    id: 'post-456',
    operations: [
      { op: 'inc', path: 'views', value: 1 },
    ],
  },

  // Delete a post
  {
    type: 'delete',
    id: 'post-789',
  },
])

console.log(`${result.results.length} operations completed`)
```

### VALIDATION - Validate Documents

```typescript
const validation = await content.validate({
  _type: 'post',
  title: '', // Invalid: empty string
  // Missing required fields
})

if (!validation.valid) {
  console.error('Errors:', validation.errors)
  // [{ path: 'title', message: 'Title is required', rule: 'required' }]
}
```

### REFERENCES - Create Document References

```typescript
const authorRef = content.reference('author-123', 'author')
// { _ref: 'author-123', _type: 'reference', _targetType: 'author' }

// Use in documents
const post = await content.create({
  _type: 'post',
  title: 'My Post',
  author: authorRef,
})
```

### CACHE INVALIDATION

```typescript
// Invalidate specific cache tags
await content.invalidateCache(['post:hello-world', 'tag:posts'])

// Invalidate by document ID
await content.invalidateCache(['post-123'])
```

## Switching Between CMSs

The power of ContentBridge: **Change one environment variable, swap CMSs!**

### Currently using Sanity?

```env
CMS_ADAPTER=sanity
SANITY_PROJECT_ID=abc123
SANITY_DATASET=production
SANITY_API_TOKEN=sk...
```

### Switch to Contentful

```env
CMS_ADAPTER=contentful
CONTENTFUL_SPACE_ID=xyz789
CONTENTFUL_ENVIRONMENT=master
CONTENTFUL_ACCESS_TOKEN=...
```

**That's it!** All your code works identically. No changes needed.

### How It Works

**File: `src/content.ts`**

```typescript
export function createContent(): ContentService {
  const adapter = process.env.CMS_ADAPTER

  if (adapter === 'sanity') {
    const client = createSanityClient({ /* config */ })
    return createSanityAdapter({ client })
  }

  if (adapter === 'contentful') {
    const client = createContentfulClient({ /* config */ })
    return createContentfulAdapter({ client })
  }

  throw new Error('Unknown adapter')
}
```

## Individual Examples

Run specific operation examples:

```bash
# CREATE operations
pnpm example:create

# READ/Query operations
pnpm example:query

# UPDATE operations
pnpm example:update

# DELETE operations
pnpm example:delete

# TRANSACTION operations
pnpm example:transaction
```

## TypeScript Support

Full type safety with ContentBridge:

```typescript
interface Post {
  _id: string
  _type: 'post'
  title: string
  slug: { _type: 'slug'; current: string }
  status: 'draft' | 'published'
  tags?: string[]
}

// Type-safe queries
const posts = await content.query<Post>()
  .type('post')
  .filter('status', '==', 'published') // ✅ Autocomplete
  .execute()

// posts is Post[]
posts[0].title // ✅ Type-safe
posts[0].invalidField // ❌ Type error
```

## Error Handling

```typescript
try {
  const post = await content.create({
    _type: 'post',
    title: 'New Post',
  })
} catch (error) {
  if (error instanceof Error) {
    console.error('Failed to create:', error.message)
  }
}
```

## Common Patterns

### Upsert (Create or Update)

```typescript
async function upsertPost(slug: string, data: Partial<Post>) {
  const existing = await content.getBySlug<Post>(slug, 'post')

  if (existing) {
    return content.update(existing._id, { ...existing, ...data })
  } else {
    return content.create(data)
  }
}
```

### Pagination

```typescript
async function getPaginatedPosts(page: number, pageSize: number) {
  const offset = (page - 1) * pageSize

  const posts = await content
    .query<Post>()
    .type('post')
    .orderBy('publishedAt', 'desc')
    .limit(pageSize)
    .offset(offset)
    .execute()

  const total = await content.count({ type: 'post' })

  return {
    posts,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
```

### Bulk Operations

```typescript
async function bulkPublish(postIds: string[]) {
  const operations = postIds.map(id => ({
    type: 'patch' as const,
    id,
    operations: [
      { op: 'set' as const, path: 'status', value: 'published' },
      { op: 'set' as const, path: 'publishedAt', value: new Date().toISOString() },
    ],
  }))

  return content.transaction(operations)
}
```

## Troubleshooting

### "Cannot connect to CMS"

- Verify `.env` has correct credentials
- Check `CMS_ADAPTER` is set to 'sanity' or 'contentful'
- Ensure API tokens have correct permissions

### "Module not found"

- Run `pnpm install` from monorepo root
- Ensure you're using Node.js 18+

### Type errors

- Run `pnpm typecheck` to see detailed errors
- Ensure TypeScript version is 5.3+

## Next Steps

1. **Explore individual examples** in `src/examples/`
2. **Try switching adapters** to see CMS-agnostic benefits
3. **Build a CLI tool** for content management
4. **Create a content migration script**
5. **Implement custom caching** with the caching example

## Related Examples

- [`examples/with-caching`](../with-caching) - Advanced caching strategies
- [`examples/nextjs-sanity`](../nextjs-sanity) - Next.js with Sanity
- [`examples/nextjs-contentful`](../nextjs-contentful) - Next.js with Contentful

## Resources

- [ContentBridge Documentation](../../README.md)
- [ContentBridge Core API](../../packages/core/README.md)
- [Sanity Adapter](../../packages/sanity/README.md)
- [Contentful Adapter](../../packages/contentful/README.md)

## License

MIT
