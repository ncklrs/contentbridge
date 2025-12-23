# Sanity Adapter

The Sanity adapter provides a unified ContentBridge interface for [Sanity CMS](https://www.sanity.io/), with full support for GROQ queries, Portable Text, and the Sanity Image API.

## Installation

```bash
# Install the adapter
pnpm add @contentbridge/sanity

# Install peer dependencies
pnpm add @sanity/client @sanity/image-url
```

## Configuration

### Basic Setup

```typescript
import { createSanityAdapter } from '@contentbridge/sanity'
import { createClient } from '@sanity/client'

// Create Sanity client
const client = createClient({
  projectId: 'your-project-id',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,  // Use CDN for better performance
  token: 'your-api-token',  // Required for mutations
})

// Create adapter
const adapter = createSanityAdapter(client, {
  projectId: 'your-project-id',
  dataset: 'production',
  apiVersion: '2024-01-01',
})

await adapter.initialize()
```

### Configuration Options

```typescript
interface SanityAdapterConfig {
  projectId: string
  dataset: string
  apiVersion?: string  // Default: '2024-01-01'
  token?: string  // Required for write operations
  useCdn?: boolean  // Default: true
  perspective?: 'published' | 'previewDrafts' | 'raw'  // Default: 'published'
  groqConfig?: GROQCompilerConfig  // Advanced GROQ compilation options
}
```

### Environment Variables

```env
SANITY_PROJECT_ID=abc123xyz
SANITY_DATASET=production
SANITY_TOKEN=sk...
SANITY_USE_CDN=true
```

```typescript
const adapter = createSanityAdapter(
  createClient({
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET,
    apiVersion: '2024-01-01',
    token: process.env.SANITY_TOKEN,
    useCdn: process.env.SANITY_USE_CDN === 'true',
  }),
  {
    projectId: process.env.SANITY_PROJECT_ID!,
    dataset: process.env.SANITY_DATASET!,
  }
)
```

## GROQ Query Examples

The Sanity adapter compiles ContentBridge queries to GROQ automatically.

### Basic Query

```typescript
// ContentBridge query
const posts = await adapter
  .query<Post>('post')
  .where('status', '==', 'published')
  .limit(10)
  .getMany()

// Compiled to GROQ:
// *[_type == 'post' && status == 'published'][0...10]
```

### Complex Filtering

```typescript
const posts = await adapter
  .query<Post>('post')
  .where('status', '==', 'published')
  .greaterThan('publishedAt', '2024-01-01')
  .contains('tags', 'javascript')
  .orderBy('publishedAt', 'desc')
  .getMany()

// GROQ:
// *[
//   _type == 'post' &&
//   status == 'published' &&
//   publishedAt > '2024-01-01' &&
//   'javascript' in tags
// ] | order(publishedAt desc)
```

### Reference Expansion

```typescript
const posts = await adapter
  .query<Post>('post')
  .expand('author', { name: true, image: true })
  .getMany()

// GROQ:
// *[_type == 'post'] {
//   ...,
//   author-> { name, image }
// }
```

### Field Selection (Projection)

```typescript
const posts = await adapter
  .query<Post>('post')
  .select('title', 'slug', 'publishedAt')
  .getMany()

// GROQ:
// *[_type == 'post'] { title, slug, publishedAt }
```

### Array Filtering

```typescript
// Posts with specific tags
const posts = await adapter
  .query<Post>('post')
  .containsAll('tags', ['javascript', 'typescript'])
  .getMany()

// GROQ:
// *[_type == 'post' && ['javascript', 'typescript'] in tags]
```

### OR Conditions

```typescript
const posts = await adapter
  .query<Post>('post')
  .or([
    { field: 'featured', operator: '==', value: true },
    { field: 'views', operator: '>', value: 10000 }
  ])
  .getMany()

// GROQ:
// *[_type == 'post' && (featured == true || views > 10000)]
```

## Portable Text

The Sanity adapter includes full support for Portable Text conversion.

### Convert to Universal Rich Text

```typescript
import { UniversalBlock } from '@contentbridge/core'

// Sanity Portable Text
const portableText = [
  {
    _type: 'block',
    children: [{ _type: 'span', text: 'Hello World', marks: ['strong'] }],
  },
]

// Convert to universal format
const universal = await adapter.toUniversalRichText(portableText)

// Use with any rendering library
const html = renderUniversalToHTML(universal.content)
```

### Convert from Universal Rich Text

```typescript
const universal: UniversalBlock[] = [
  {
    type: 'paragraph',
    children: [
      { type: 'text', text: 'Hello World', bold: true }
    ]
  }
]

// Convert to Portable Text
const portableText = await adapter.fromUniversalRichText({
  _type: 'richtext',
  content: universal
})

// Save to Sanity
await adapter.create('post', {
  title: 'My Post',
  body: portableText
})
```

### Custom Block Types

```typescript
// Your custom Portable Text block
const portableText = [
  {
    _type: 'block',
    children: [{ _type: 'span', text: 'Intro' }],
  },
  {
    _type: 'callout',  // Custom block type
    message: 'Important note',
    variant: 'warning',
  },
]

// Convert preserves custom blocks
const universal = await adapter.toUniversalRichText(portableText)
// Custom blocks are converted to type: 'custom' with original data
```

## Image URL Generation

Use the Sanity Image API through ContentBridge:

### Basic Image URL

```typescript
import type { MediaAsset } from '@contentbridge/core'

const post = await adapter.getById<Post>('post-123')
const imageUrl = await adapter.resolveMediaUrl(post.data.image, {
  width: 800,
  height: 600,
  format: 'webp',
  quality: 80,
})

// Returns: https://cdn.sanity.io/images/abc/production/xyz-800x600.webp?q=80
```

### Responsive Images

```typescript
const responsiveImage = await adapter.getResponsiveImage(post.data.image, {
  widths: [320, 640, 1024, 1920],
  formats: ['webp', 'jpg'],
  quality: 80,
})

// Use in HTML
const html = `
  <picture>
    ${responsiveImage.sources.map(source => `
      <source
        srcset="${source.srcset}"
        type="${source.type}"
        sizes="${source.sizes}"
      />
    `).join('')}
    <img src="${responsiveImage.src}" alt="${responsiveImage.alt}" />
  </picture>
`
```

### Image Transforms

All Sanity image transformations are supported:

```typescript
const url = await adapter.resolveMediaUrl(image, {
  width: 800,
  height: 600,
  fit: 'crop',  // crop, fill, fillmax, max, scale, clip, min
  crop: 'center',
  format: 'webp',
  quality: 80,
  blur: 50,  // Blur effect
  sharpen: 50,  // Sharpen effect
  saturation: -100,  // Grayscale
  flip: 'h',  // Horizontal flip
  rotate: 90,  // Rotation
})
```

### Placeholders (LQIP)

```typescript
const placeholder = await adapter.getPlaceholder(image, {
  type: 'lqip',  // Low Quality Image Placeholder
  width: 20,
  quality: 50,
})

// Returns base64 data URL for blur-up effect
// "data:image/webp;base64,UklGRi..."
```

## Preview/Draft Mode

Access draft content with perspective:

```typescript
// Production: only published content
const prodAdapter = createSanityAdapter(client, {
  projectId: 'abc123',
  dataset: 'production',
  perspective: 'published',  // Default
})

// Preview: include drafts
const previewAdapter = createSanityAdapter(client, {
  projectId: 'abc123',
  dataset: 'production',
  perspective: 'previewDrafts',
})

// Query drafts
const drafts = await previewAdapter
  .query<Post>('post')
  .getMany()  // Returns published + draft documents
```

### Next.js Draft Mode

```typescript
// app/api/draft/route.ts
import { draftMode } from 'next/headers'

export async function GET(request: Request) {
  draftMode().enable()
  return new Response('Draft mode enabled')
}

// lib/cms.ts
import { draftMode } from 'next/headers'

export function createCMSAdapter() {
  const isDraftMode = draftMode().isEnabled

  return createSanityAdapter(client, {
    projectId: process.env.SANITY_PROJECT_ID!,
    dataset: process.env.SANITY_DATASET!,
    perspective: isDraftMode ? 'previewDrafts' : 'published',
    useCdn: !isDraftMode,  // Don't use CDN in draft mode
  })
}
```

## Mutations

### Create Document

```typescript
const post = await adapter.create<Post>('post', {
  title: 'Hello Sanity',
  slug: { _type: 'slug', current: 'hello-sanity' },
  publishedAt: new Date().toISOString(),
  body: [],
})
```

### Update Document

```typescript
// Full update
const updated = await adapter.update<Post>(post._id, {
  title: 'Updated Title',
})

// Patch (recommended for partial updates)
const patched = await adapter.patch<Post>(post._id, [
  { op: 'set', path: 'title', value: 'New Title' },
  { op: 'set', path: 'featured', value: true },
])
```

### Array Operations

```typescript
// Add item to array
await adapter.patch<Post>(post._id, [
  {
    op: 'insert',
    path: 'tags',
    value: 'javascript',
    position: 'after',  // or 'before', index
  },
])

// Remove item from array
await adapter.patch<Post>(post._id, [
  { op: 'unset', path: 'tags[tags == "old-tag"]' },
])
```

### Transactions

```typescript
const result = await adapter.transaction([
  {
    type: 'create',
    documentType: 'author',
    data: { name: 'Jane Doe', email: 'jane@example.com' },
  },
  {
    type: 'create',
    documentType: 'post',
    data: {
      title: 'Post by Jane',
      author: { _ref: 'author-123' },
    },
  },
])
```

## Advanced GROQ

### Raw GROQ Queries

For advanced use cases, compile to GROQ directly:

```typescript
const groq = await adapter.compileQuery({
  type: 'post',
  filter: [
    { field: 'status', operator: '==', value: 'published' }
  ],
  limit: 10,
})

console.log(groq)
// *[_type == 'post' && status == 'published'][0...10]

// Execute custom GROQ
const result = await adapter.client.fetch(groq)
```

### GROQ Projection Mapping

```typescript
const posts = await adapter
  .query<Post>('post')
  .select('title', 'slug', 'author')
  .expand('author', { name: true, email: true })
  .getMany()

// GROQ with custom projection:
// *[_type == 'post'] {
//   title,
//   slug,
//   author,
//   author-> { name, email }
// }
```

## Type Generation

Generate TypeScript types from Sanity schemas (coming soon):

```typescript
// Generate types from your schema
const schemas = await adapter.getSchemas()
const types = await adapter.generateTypes(schemas, {
  format: 'typescript',
  strict: true,
})

// Write to file
import fs from 'fs/promises'
await fs.writeFile('types/sanity.generated.ts', types.interfaces)
```

## Best Practices

### 1. Use CDN for Production

```typescript
const adapter = createSanityAdapter(client, {
  projectId: 'abc123',
  dataset: 'production',
  useCdn: process.env.NODE_ENV === 'production',
})
```

### 2. Cache Queries

```typescript
const posts = await adapter
  .query<Post>('post')
  .tags('posts', 'published')
  .ttl(3600)  // Cache for 1 hour
  .getMany()
```

### 3. Select Only Needed Fields

```typescript
// Good: Only fetch what you need
const posts = await adapter
  .query<Post>('post')
  .select('title', 'slug', 'excerpt')
  .getMany()

// Bad: Fetching everything (slower, more data)
const posts = await adapter
  .query<Post>('post')
  .getMany()
```

### 4. Use Transactions for Related Mutations

```typescript
// Good: Atomic transaction
await adapter.transaction([
  { type: 'create', documentType: 'author', data: authorData },
  { type: 'create', documentType: 'post', data: postData },
])

// Bad: Separate operations (not atomic)
await adapter.create('author', authorData)
await adapter.create('post', postData)  // Might fail after author created
```

### 5. Handle Drafts in Preview Mode

```typescript
const adapter = createSanityAdapter(client, {
  projectId: 'abc123',
  dataset: 'production',
  perspective: isDraftMode ? 'previewDrafts' : 'published',
  useCdn: !isDraftMode,
})
```

## Migration from Direct Sanity Client

### Before (Sanity Client)

```typescript
import { createClient } from '@sanity/client'

const client = createClient({ /* config */ })

// Fetch posts
const posts = await client.fetch(`
  *[_type == 'post' && status == 'published'] | order(publishedAt desc)[0...10]
`)

// Create post
const post = await client.create({
  _type: 'post',
  title: 'Hello',
  slug: { _type: 'slug', current: 'hello' },
})
```

### After (ContentBridge)

```typescript
import { createSanityAdapter } from '@contentbridge/sanity'
import { createClient } from '@sanity/client'

const client = createClient({ /* config */ })
const adapter = createSanityAdapter(client, { /* config */ })

// Fetch posts (type-safe!)
const posts = await adapter
  .query<Post>('post')
  .where('status', '==', 'published')
  .orderBy('publishedAt', 'desc')
  .limit(10)
  .getMany()

// Create post (type-safe!)
const post = await adapter.create<Post>('post', {
  title: 'Hello',
  slug: { _type: 'slug', current: 'hello' },
})
```

### Benefits

- Type safety with TypeScript
- No GROQ syntax to learn
- Portable across CMSs
- Better error handling
- Consistent API

## Troubleshooting

### "Invalid API version"

Make sure your API version is in YYYY-MM-DD format:

```typescript
const adapter = createSanityAdapter(client, {
  apiVersion: '2024-01-01',  // Correct
  // apiVersion: '1',  // Wrong
})
```

### "Unauthorized" on Mutations

Make sure your token has write permissions:

```typescript
const client = createClient({
  projectId: 'abc123',
  dataset: 'production',
  token: process.env.SANITY_TOKEN,  // Required for mutations
})
```

### GROQ Compilation Errors

If a query doesn't compile to valid GROQ, you can access the raw query config:

```typescript
const query = adapter
  .query<Post>('post')
  .where('complex', 'operator', 'value')

const config = query.toQuery()
console.log(config)  // Inspect the QueryConfig

// Or compile manually
const groq = await adapter.compileQuery(config)
console.log(groq)
```

## Resources

- [Sanity Documentation](https://www.sanity.io/docs)
- [GROQ Reference](https://www.sanity.io/docs/groq)
- [Portable Text Spec](https://portabletext.org/)
- [ContentBridge API Reference](../api-reference.md)
