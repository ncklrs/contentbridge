# Payload Adapter

The Payload adapter provides a unified ContentBridge interface for [Payload CMS](https://payloadcms.com/), supporting both the Local API (direct database access) and REST API, with Slate rich text conversion.

## Installation

```bash
# Install the adapter
pnpm add @contentbridge/payload

# Install peer dependency
pnpm add payload
```

## Configuration

### Local API (Recommended)

The Local API provides the best performance by accessing Payload's database directly:

```typescript
import { createPayloadAdapter } from '@contentbridge/payload'
import payload from 'payload'

// Initialize Payload
await payload.init({
  secret: process.env.PAYLOAD_SECRET,
  mongoURL: process.env.MONGODB_URI,
  local: true,  // Enable Local API
})

// Create adapter with Local API
const adapter = createPayloadAdapter(payload, {
  apiType: 'local',
  locale: 'en',
})

await adapter.initialize()
```

### REST API

For remote access or serverless environments:

```typescript
import { createPayloadAdapter } from '@contentbridge/payload'

const adapter = createPayloadAdapter(null, {
  apiType: 'rest',
  apiUrl: 'https://your-payload-server.com/api',
  apiKey: process.env.PAYLOAD_API_KEY,
  locale: 'en',
})

await adapter.initialize()
```

### Configuration Options

```typescript
interface PayloadAdapterConfig {
  apiType: 'local' | 'rest'
  apiUrl?: string  // Required for REST API
  apiKey?: string  // API key for authenticated requests
  locale?: string  // Default locale
  depth?: number  // Default depth for populating relationships
  fallbackLocale?: string | false  // Fallback locale
  draft?: boolean  // Include draft documents
}
```

### Environment Variables

```env
PAYLOAD_SECRET=your-secret-key
MONGODB_URI=mongodb://localhost:27017/payload
PAYLOAD_API_URL=https://your-server.com/api
PAYLOAD_API_KEY=your-api-key
```

```typescript
const adapter = createPayloadAdapter(payload, {
  apiType: process.env.NODE_ENV === 'production' ? 'rest' : 'local',
  apiUrl: process.env.PAYLOAD_API_URL,
  apiKey: process.env.PAYLOAD_API_KEY,
})
```

## Querying Content

### Basic Queries

```typescript
interface Post extends BaseDocument {
  _type: 'posts'
  title: string
  slug: string
  content: unknown
  publishedDate: string
  status: 'draft' | 'published'
}

// Simple query
const posts = await adapter
  .query<Post>('posts')
  .where('status', '==', 'published')
  .limit(10)
  .getMany()
```

### Field Filtering

Payload supports MongoDB-style queries:

```typescript
const posts = await adapter
  .query<Post>('posts')
  .where('status', '==', 'published')
  .greaterThan('publishedDate', '2024-01-01')
  .contains('tags', 'javascript')
  .getMany()

// Compiles to Payload query:
// {
//   status: { equals: 'published' },
//   publishedDate: { greater_than: '2024-01-01' },
//   tags: { contains: 'javascript' }
// }
```

### Relationship Population

Resolve relationships (Payload's equivalent of references):

```typescript
interface Post extends BaseDocument {
  _type: 'posts'
  title: string
  author: string | Author  // Relationship field
}

interface Author extends BaseDocument {
  _type: 'authors'
  name: string
  email: string
}

// Populate author relationship
const posts = await adapter
  .query<Post>('posts')
  .expand('author', { name: true, email: true })
  .getMany()

// author is now a full Author object instead of just an ID
posts.data.forEach(post => {
  console.log(`${post.title} by ${post.author.name}`)
})
```

### Deep Population

Control depth of relationship resolution:

```typescript
const posts = await adapter
  .query<Post>('posts')
  .resolveReferences(2)  // Populate 2 levels deep
  .getMany()

// Payload parameter: depth=2
```

### Search

Full-text search across fields:

```typescript
const posts = await adapter
  .query<Post>('posts')
  .match('title', 'javascript tutorial')
  .getMany()

// Uses Payload's search parameter
```

### Complex Queries

Combine multiple conditions:

```typescript
const posts = await adapter
  .query<Post>('posts')
  .or([
    { field: 'featured', operator: '==', value: true },
    { field: 'views', operator: '>', value: 10000 }
  ])
  .where('status', '==', 'published')
  .orderBy('publishedDate', 'desc')
  .getMany()
```

## Slate Rich Text

Payload uses Slate for rich text. ContentBridge converts between Slate and Universal Rich Text.

### Convert from Slate

```typescript
// Payload Slate content
const slateContent = [
  {
    type: 'paragraph',
    children: [
      { text: 'Hello ' },
      { text: 'World', bold: true },
    ],
  },
]

// Convert to universal format
const universal = await adapter.toUniversalRichText(slateContent)

// Render with any library
const html = renderToHTML(universal.content)
```

### Convert to Slate

```typescript
import { UniversalBlock } from '@contentbridge/core'

const universal: UniversalBlock[] = [
  {
    type: 'paragraph',
    children: [
      { type: 'text', text: 'Hello ' },
      { type: 'text', text: 'World', bold: true },
    ],
  },
  {
    type: 'heading',
    level: 2,
    children: [{ type: 'text', text: 'Heading' }],
  },
]

// Convert to Slate
const slateContent = await adapter.fromUniversalRichText({
  _type: 'richtext',
  content: universal,
})

// Save to Payload
await adapter.create('posts', {
  title: 'My Post',
  content: slateContent,
})
```

### Custom Elements

```typescript
// Slate with custom elements
const slateContent = [
  {
    type: 'callout',  // Custom block type
    variant: 'warning',
    children: [{ text: 'Important note' }],
  },
]

const universal = await adapter.toUniversalRichText(slateContent)
// Custom elements become type: 'custom' blocks
```

## Upload Fields

Payload has powerful file upload handling.

### Upload Images

```typescript
// Upload a file
const file = await payload.create({
  collection: 'media',
  data: {
    alt: 'Profile picture',
  },
  filePath: '/path/to/image.jpg',
})

// Use in document
await adapter.create('authors', {
  name: 'John Doe',
  avatar: file.id,  // Reference to uploaded file
})
```

### Image URLs

```typescript
const author = await adapter.getById<Author>('author-123')

// Get image URL
const imageUrl = await adapter.resolveMediaUrl(author.data.avatar, {
  width: 800,
  height: 600,
  format: 'webp',
  quality: 80,
})

// Payload automatically serves optimized images
// /api/media/file/image-id-800x600.webp?quality=80
```

### Responsive Images

```typescript
const responsiveImage = await adapter.getResponsiveImage(author.data.avatar, {
  widths: [320, 640, 1024, 1920],
  formats: ['webp', 'jpg'],
  quality: 80,
})

// Generate picture element
const html = `
  <picture>
    ${responsiveImage.sources.map(source => `
      <source srcset="${source.srcset}" type="${source.type}" />
    `).join('')}
    <img src="${responsiveImage.src}" alt="${author.data.name}" />
  </picture>
`
```

## Localization

Payload has comprehensive localization support.

### Query with Locale

```typescript
// Get Spanish content
const posts = await adapter
  .query<Post>('posts')
  .locale('es')
  .getMany()

// Payload parameter: locale=es
```

### Fallback Locale

```typescript
// Spanish with English fallback
const posts = await adapter
  .query<Post>('posts')
  .locale('es', 'en')
  .getMany()

// If es translation doesn't exist, return en
```

### All Locales

```typescript
// Get content in all locales
const post = await payload.findByID({
  collection: 'posts',
  id: 'post-123',
  locale: 'all',
})

// Fields contain all locales:
// { title: { en: 'Hello', es: 'Hola' } }
```

## Authentication

Payload has built-in authentication and access control.

### Authenticated Requests (Local API)

```typescript
// Login user
const { user, token } = await payload.login({
  collection: 'users',
  data: {
    email: 'user@example.com',
    password: 'password',
  },
})

// Use Local API with user context
const posts = await payload.find({
  collection: 'posts',
  user,  // Pass authenticated user
})
```

### Authenticated Requests (REST API)

```typescript
const adapter = createPayloadAdapter(null, {
  apiType: 'rest',
  apiUrl: 'https://your-server.com/api',
  apiKey: process.env.PAYLOAD_API_KEY,
})

// API key is automatically included in requests
const posts = await adapter
  .query<Post>('posts')
  .getMany()
```

## Draft Mode

Access draft/unpublished content.

### Enable Drafts

```typescript
const adapter = createPayloadAdapter(payload, {
  apiType: 'local',
  draft: true,  // Include draft documents
})

// Query includes drafts
const posts = await adapter
  .query<Post>('posts')
  .getMany()  // Returns both published and draft posts
```

### Next.js Draft Mode

```typescript
// app/api/draft/route.ts
import { draftMode } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.DRAFT_SECRET) {
    return new Response('Invalid token', { status: 401 })
  }

  draftMode().enable()
  return new Response('Draft mode enabled')
}

// lib/cms.ts
import { draftMode } from 'next/headers'
import payload from 'payload'

export function createCMSAdapter() {
  const isDraft = draftMode().isEnabled

  return createPayloadAdapter(payload, {
    apiType: 'local',
    draft: isDraft,
  })
}
```

## Mutations

### Create Document

```typescript
const post = await adapter.create<Post>('posts', {
  title: 'Hello Payload',
  slug: 'hello-payload',
  content: slateContent,
  status: 'draft',
})
```

### Update Document

```typescript
// Full update
const updated = await adapter.update<Post>(post.id, {
  title: 'Updated Title',
  status: 'published',
})

// Partial update (patch)
const patched = await adapter.patch<Post>(post.id, [
  { op: 'set', path: 'title', value: 'New Title' },
  { op: 'set', path: 'featured', value: true },
])
```

### Delete Document

```typescript
const deleted = await adapter.delete<Post>('post-123')
console.log(`Deleted: ${deleted.title}`)
```

### Transactions

Payload doesn't have native transactions, but ContentBridge provides transaction-like behavior:

```typescript
const result = await adapter.transaction([
  {
    type: 'create',
    documentType: 'authors',
    data: { name: 'Jane Doe', email: 'jane@example.com' },
  },
  {
    type: 'create',
    documentType: 'posts',
    data: {
      title: 'Post by Jane',
      author: 'author-123',  // Reference
    },
  },
])

if (!result.success) {
  // All operations are rolled back on error
  console.error('Transaction failed:', result.errors)
}
```

## Access Control

Payload's access control is respected by the adapter.

### Collection-Level Access

```typescript
// If user doesn't have read access to collection
try {
  const posts = await adapter
    .query<Post>('admin-posts')
    .getMany()
} catch (error) {
  // Error: Forbidden
}
```

### Field-Level Access

```typescript
// Fields user can't access are omitted from results
const users = await adapter
  .query<User>('users')
  .getMany()

// Sensitive fields (e.g., password) are automatically excluded
```

## Hooks

Payload hooks are triggered automatically by ContentBridge operations.

### Before/After Hooks

```typescript
// In your Payload config
const Posts = {
  slug: 'posts',
  hooks: {
    beforeCreate: [
      ({ data }) => {
        console.log('Creating post:', data.title)
        return data
      },
    ],
    afterCreate: [
      ({ doc }) => {
        console.log('Created post:', doc.id)
      },
    ],
  },
}

// Hooks run automatically
const post = await adapter.create('posts', {
  title: 'New Post',
})
// Console: "Creating post: New Post"
// Console: "Created post: 123"
```

## Best Practices

### 1. Use Local API in Production

```typescript
// Good: Fast direct database access
const adapter = createPayloadAdapter(payload, {
  apiType: 'local',
})

// Only use REST API when necessary (serverless, etc.)
```

### 2. Control Population Depth

```typescript
// Good: Only populate what you need
const posts = await adapter
  .query<Post>('posts')
  .expand('author')  // 1 level
  .getMany()

// Bad: Deep population (slow)
const posts = await adapter
  .query<Post>('posts')
  .resolveReferences(5)  // 5 levels!
  .getMany()
```

### 3. Select Specific Fields

```typescript
// Good: Only fetch needed fields
const posts = await adapter
  .query<Post>('posts')
  .select('title', 'slug', 'publishedDate')
  .getMany()

// Bad: Fetching everything
const posts = await adapter
  .query<Post>('posts')
  .getMany()
```

### 4. Use Pagination

```typescript
// Paginate large collections
const page = 1
const pageSize = 20

const posts = await adapter
  .query<Post>('posts')
  .limit(pageSize)
  .offset((page - 1) * pageSize)
  .getMany()
```

### 5. Cache Queries

```typescript
const posts = await adapter
  .query<Post>('posts')
  .where('status', '==', 'published')
  .tags('posts', 'published')
  .ttl(3600)  // Cache for 1 hour
  .getMany()
```

## Migration from Payload SDK

### Before (Direct Payload)

```typescript
import payload from 'payload'

await payload.init({
  secret: process.env.PAYLOAD_SECRET,
  mongoURL: process.env.MONGODB_URI,
  local: true,
})

// Find posts
const posts = await payload.find({
  collection: 'posts',
  where: {
    status: { equals: 'published' },
  },
  sort: '-publishedDate',
  limit: 10,
})

const results = posts.docs
```

### After (ContentBridge)

```typescript
import { createPayloadAdapter } from '@contentbridge/payload'
import payload from 'payload'

await payload.init({
  secret: process.env.PAYLOAD_SECRET,
  mongoURL: process.env.MONGODB_URI,
  local: true,
})

const adapter = createPayloadAdapter(payload, {
  apiType: 'local',
})

// Type-safe query
const result = await adapter
  .query<Post>('posts')
  .where('status', '==', 'published')
  .orderBy('publishedDate', 'desc')
  .limit(10)
  .getMany()

const posts = result.data
```

### Benefits

- Type safety with TypeScript
- Framework-agnostic
- Portable to other CMSs
- Consistent API across CMSs
- Rich text conversion included

## Troubleshooting

### "Collection not found"

Verify your collection slug matches Payload config:

```typescript
// Payload config
const Posts = {
  slug: 'posts',  // Use this slug
}

// Query
const posts = await adapter
  .query<Post>('posts')  // Must match slug
  .getMany()
```

### "Cannot populate relationship"

Make sure relationship field is configured in Payload:

```typescript
const Posts = {
  fields: [
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'authors',  // Must reference valid collection
    },
  ],
}
```

### Local API Not Working

Ensure Payload is initialized:

```typescript
await payload.init({
  secret: process.env.PAYLOAD_SECRET,
  mongoURL: process.env.MONGODB_URI,
  local: true,  // Must be true
})
```

### REST API Authentication

Make sure API key has correct permissions:

```typescript
// In Payload config
const Users = {
  slug: 'users',
  auth: {
    tokenExpiration: 7200,
    useAPIKey: true,  // Enable API keys
  },
}
```

## Resources

- [Payload Documentation](https://payloadcms.com/docs)
- [Local API](https://payloadcms.com/docs/local-api/overview)
- [REST API](https://payloadcms.com/docs/rest-api/overview)
- [Rich Text (Slate)](https://payloadcms.com/docs/fields/rich-text)
- [ContentBridge API Reference](../api-reference.md)
