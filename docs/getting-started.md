# Getting Started with ContentBridge

A step-by-step guide to get up and running with ContentBridge in your project.

## Installation

ContentBridge is split into multiple packages - a core package and adapter-specific packages. Install the core package plus the adapter(s) for your CMS platform.

```bash
# Install core package (required)
pnpm add @contentbridge/core

# Install your CMS adapter(s)
pnpm add @contentbridge/sanity      # For Sanity CMS
pnpm add @contentbridge/contentful  # For Contentful
pnpm add @contentbridge/payload     # For Payload CMS
pnpm add @contentbridge/strapi      # For Strapi
```

### Peer Dependencies

Each adapter requires its CMS-specific SDK:

```bash
# Sanity
pnpm add @sanity/client @sanity/image-url

# Contentful
pnpm add contentful contentful-management

# Payload
pnpm add payload

# Strapi
pnpm add axios  # Strapi adapter uses axios for REST calls
```

## Quick Start

### 1. Choose Your Adapter

Pick the adapter for your CMS platform and create an instance:

```typescript
import { createSanityAdapter } from '@contentbridge/sanity'
import { createClient } from '@sanity/client'

// Create Sanity client
const client = createClient({
  projectId: 'your-project-id',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

// Create adapter
const adapter = createSanityAdapter(client, {
  projectId: 'your-project-id',
  dataset: 'production',
})

// Initialize (optional but recommended)
await adapter.initialize()
```

### 2. Your First Query

Use the fluent query builder to fetch content:

```typescript
import type { BaseDocument } from '@contentbridge/core'

// Define your document type
interface Post extends BaseDocument {
  _type: 'post'
  title: string
  slug: { current: string }
  publishedAt: string
  content: unknown[]
  status: 'draft' | 'published'
}

// Query published posts
const posts = await adapter
  .query<Post>('post')
  .where('status', '==', 'published')
  .orderBy('publishedAt', 'desc')
  .limit(10)
  .getMany()

console.log(`Found ${posts.data.length} posts`)
posts.data.forEach(post => {
  console.log(`- ${post.title}`)
})
```

### 3. Get a Single Document

Fetch documents by ID or slug:

```typescript
// By ID
const result = await adapter.getById<Post>('post-123')
if (result.data) {
  console.log(result.data.title)
}

// By slug (if your CMS supports it)
const post = await adapter
  .query<Post>('post')
  .where('slug.current', '==', 'hello-world')
  .getOne()
```

### 4. Create Content

Create new documents with type-safe data:

```typescript
const newPost = await adapter.create<Post>('post', {
  title: 'Getting Started with ContentBridge',
  slug: { current: 'getting-started' },
  publishedAt: new Date().toISOString(),
  content: [],
  status: 'draft',
})

console.log(`Created post: ${newPost._id}`)
```

### 5. Update Content

Update existing documents:

```typescript
// Full update (replace document)
const updated = await adapter.update<Post>(newPost._id, {
  title: 'Updated Title',
  status: 'published',
})

// Partial update (patch specific fields)
const patched = await adapter.patch<Post>(newPost._id, [
  { op: 'set', path: 'status', value: 'published' },
  { op: 'set', path: 'publishedAt', value: new Date().toISOString() },
])
```

## Configuration Examples

### Environment Variables

Store your CMS credentials in environment variables:

```env
# .env
SANITY_PROJECT_ID=your-project-id
SANITY_DATASET=production
SANITY_TOKEN=your-api-token

CONTENTFUL_SPACE_ID=your-space-id
CONTENTFUL_ACCESS_TOKEN=your-access-token
CONTENTFUL_MANAGEMENT_TOKEN=your-management-token

PAYLOAD_API_URL=http://localhost:3000/api
PAYLOAD_API_KEY=your-api-key

STRAPI_API_URL=http://localhost:1337
STRAPI_API_TOKEN=your-api-token
```

### Configuration File

Create a reusable adapter factory:

```typescript
// lib/cms.ts
import { createSanityAdapter } from '@contentbridge/sanity'
import { createClient } from '@sanity/client'

export function createCMSAdapter() {
  const client = createClient({
    projectId: process.env.SANITY_PROJECT_ID!,
    dataset: process.env.SANITY_DATASET!,
    apiVersion: '2024-01-01',
    token: process.env.SANITY_TOKEN,
    useCdn: process.env.NODE_ENV === 'production',
  })

  return createSanityAdapter(client, {
    projectId: process.env.SANITY_PROJECT_ID!,
    dataset: process.env.SANITY_DATASET!,
    perspective: process.env.NODE_ENV === 'production'
      ? 'published'
      : 'previewDrafts',
  })
}

// Usage
import { createCMSAdapter } from '@/lib/cms'

const adapter = createCMSAdapter()
await adapter.initialize()
```

## Advanced Queries

### Filtering

Multiple filter conditions with different operators:

```typescript
const posts = await adapter
  .query<Post>('post')
  .where('status', '==', 'published')
  .where('publishedAt', '<=', new Date().toISOString())
  .greaterThan('views', 1000)
  .contains('tags', 'javascript')
  .getMany()
```

### Pagination

Limit and offset for pagination:

```typescript
const page = 2
const pageSize = 20

const result = await adapter
  .query<Post>('post')
  .limit(pageSize)
  .offset((page - 1) * pageSize)
  .getMany()

console.log(`Page ${page}: ${result.data.length} items`)
console.log(`Total: ${result.total} items`)
```

### Field Selection

Select only the fields you need:

```typescript
const posts = await adapter
  .query<Post>('post')
  .select('title', 'slug', 'publishedAt')
  .getMany()

// Results only contain selected fields
posts.data.forEach(post => {
  console.log(post.title, post.slug)
  // post.content is undefined (not selected)
})
```

### Reference Expansion

Automatically resolve referenced documents:

```typescript
interface Post extends BaseDocument {
  _type: 'post'
  title: string
  author: DocumentReference  // Reference to author document
}

const posts = await adapter
  .query<Post>('post')
  .expand('author', { name: true, image: true })
  .getMany()

// author is now a full document instead of just a reference
posts.data.forEach(post => {
  console.log(`${post.title} by ${post.author.name}`)
})
```

## Mutations

### Creating Multiple Documents

Use transactions for atomic operations:

```typescript
const result = await adapter.transaction([
  {
    type: 'create',
    documentType: 'author',
    data: {
      name: 'Jane Doe',
      email: 'jane@example.com',
    },
  },
  {
    type: 'create',
    documentType: 'post',
    data: {
      title: 'Hello World',
      slug: { current: 'hello-world' },
      author: { _ref: 'author-123' },
    },
  },
])

if (result.success) {
  console.log('All operations succeeded')
  result.results.forEach((r, i) => {
    console.log(`Operation ${i}: ${r.id}`)
  })
} else {
  console.error('Transaction failed:', result.errors)
}
```

### Batch Updates

Update multiple documents in a single transaction:

```typescript
const postIds = ['post-1', 'post-2', 'post-3']

const result = await adapter.transaction(
  postIds.map(id => ({
    type: 'update',
    id,
    data: { status: 'published' },
  }))
)
```

### Delete Operation

```typescript
const deleted = await adapter.delete<Post>('post-123')
console.log(`Deleted: ${deleted.title}`)
```

## Error Handling

Always handle potential errors:

```typescript
try {
  const post = await adapter.getById<Post>('post-123')
  if (!post.data) {
    console.log('Post not found')
    return
  }
  console.log(post.data.title)
} catch (error) {
  if (error instanceof Error) {
    console.error('Query failed:', error.message)
  }
}
```

For mutations, check the transaction result:

```typescript
const result = await adapter.transaction([
  { type: 'create', documentType: 'post', data: { title: 'Test' } },
])

if (!result.success) {
  console.error('Transaction failed:')
  result.errors.forEach(err => {
    console.error(`- Operation ${err.operation}: ${err.message}`)
  })
}
```

## Caching

Built-in cache support with tags:

```typescript
const posts = await adapter
  .query<Post>('post')
  .where('status', '==', 'published')
  .tags('posts', 'published-posts')
  .ttl(3600)  // Cache for 1 hour
  .getMany()

// Invalidate cache when content changes
await adapter.invalidateCache(['posts'])
```

## Next Steps

- **Adapter-Specific Guides**: See detailed guides for your CMS:
  - [Sanity Guide](./adapters/sanity.md)
  - [Contentful Guide](./adapters/contentful.md)
  - [Payload Guide](./adapters/payload.md)
  - [Strapi Guide](./adapters/strapi.md)

- **API Reference**: Full API documentation in [api-reference.md](./api-reference.md)

- **Migration Guide**: Switching from another CMS? Check the migration examples in each adapter guide.

## TypeScript Support

ContentBridge is fully type-safe. Define your document types:

```typescript
import type { BaseDocument, DocumentReference, Slug } from '@contentbridge/core'

interface Author extends BaseDocument {
  _type: 'author'
  name: string
  email: string
  bio?: string
  image?: DocumentReference
}

interface Post extends BaseDocument {
  _type: 'post'
  title: string
  slug: Slug
  author: DocumentReference
  publishedAt: string
  content: unknown[]
  tags: string[]
  status: 'draft' | 'published'
}

// Queries are fully typed
const posts = await adapter
  .query<Post>('post')
  .where('status', '==', 'published')  // ✓ type-safe field names
  .getMany()

// Results are typed
posts.data.forEach(post => {
  console.log(post.title)  // ✓ TypeScript knows this is a string
})
```

## Framework Integration

### Next.js

```typescript
// app/posts/page.tsx
import { createCMSAdapter } from '@/lib/cms'

export default async function PostsPage() {
  const adapter = createCMSAdapter()

  const posts = await adapter
    .query<Post>('post')
    .where('status', '==', 'published')
    .orderBy('publishedAt', 'desc')
    .getMany()

  return (
    <div>
      <h1>Blog Posts</h1>
      {posts.data.map(post => (
        <article key={post._id}>
          <h2>{post.title}</h2>
        </article>
      ))}
    </div>
  )
}
```

### Astro

```astro
---
// src/pages/posts.astro
import { createCMSAdapter } from '../lib/cms'

const adapter = createCMSAdapter()
const posts = await adapter
  .query<Post>('post')
  .where('status', '==', 'published')
  .getMany()
---

<html>
  <body>
    <h1>Blog Posts</h1>
    {posts.data.map(post => (
      <article>
        <h2>{post.title}</h2>
      </article>
    ))}
  </body>
</html>
```

### Remix

```typescript
// app/routes/posts.tsx
import type { LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { createCMSAdapter } from '~/lib/cms'

export async function loader({ request }: LoaderFunctionArgs) {
  const adapter = createCMSAdapter()
  const posts = await adapter
    .query<Post>('post')
    .where('status', '==', 'published')
    .getMany()

  return json({ posts: posts.data })
}

export default function PostsRoute() {
  const { posts } = useLoaderData<typeof loader>()

  return (
    <div>
      <h1>Blog Posts</h1>
      {posts.map(post => (
        <article key={post._id}>
          <h2>{post.title}</h2>
        </article>
      ))}
    </div>
  )
}
```

## Troubleshooting

### Common Issues

**"Adapter not initialized"**
```typescript
// Make sure to call initialize()
const adapter = createSanityAdapter(client, config)
await adapter.initialize()  // Don't forget this!
```

**"Type mismatch in query"**
```typescript
// Ensure your document type extends BaseDocument
interface Post extends BaseDocument {
  _type: 'post'
  // ... your fields
}
```

**"Cannot resolve references"**
```typescript
// Make sure to use expand() for references
const posts = await adapter
  .query<Post>('post')
  .expand('author')  // Resolve author reference
  .getMany()
```

Need more help? Check the [API Reference](./api-reference.md) or open an issue on GitHub.
