# Contentful Adapter

The Contentful adapter provides a unified ContentBridge interface for [Contentful](https://www.contentful.com/), supporting both the Content Delivery API (CDA) and Content Management API (CMA), with full Rich Text conversion.

## Installation

```bash
# Install the adapter
pnpm add @contentbridge/contentful

# Install peer dependencies
pnpm add contentful contentful-management
```

## Configuration

### Basic Setup

```typescript
import { createContentfulAdapter } from '@contentbridge/contentful'
import { createClient } from 'contentful'
import { createClient as createManagementClient } from 'contentful-management'

// For read-only operations (Content Delivery API)
const deliveryClient = createClient({
  space: 'your-space-id',
  accessToken: 'your-delivery-token',
})

const adapter = createContentfulAdapter(deliveryClient, {
  spaceId: 'your-space-id',
  environment: 'master',
})

await adapter.initialize()
```

### With Write Operations

```typescript
// For mutations (Content Management API)
const managementClient = createManagementClient({
  accessToken: 'your-management-token',
})

const adapter = createContentfulAdapter(
  deliveryClient,
  {
    spaceId: 'your-space-id',
    environment: 'master',
    accessToken: 'your-delivery-token',
    managementToken: 'your-management-token',
  },
  managementClient  // Pass management client for mutations
)
```

### Configuration Options

```typescript
interface ContentfulAdapterConfig {
  spaceId: string
  environment?: string  // Default: 'master'
  accessToken?: string  // Delivery API token
  previewToken?: string  // Preview API token (for drafts)
  managementToken?: string  // Management API token (for mutations)
  locale?: string  // Default locale
  includeContentSourceMaps?: boolean  // For preview mode
}
```

### Environment Variables

```env
CONTENTFUL_SPACE_ID=abc123xyz
CONTENTFUL_ENVIRONMENT=master
CONTENTFUL_ACCESS_TOKEN=your-delivery-token
CONTENTFUL_PREVIEW_TOKEN=your-preview-token
CONTENTFUL_MANAGEMENT_TOKEN=your-management-token
```

```typescript
const deliveryClient = createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
})

const adapter = createContentfulAdapter(deliveryClient, {
  spaceId: process.env.CONTENTFUL_SPACE_ID!,
  environment: process.env.CONTENTFUL_ENVIRONMENT || 'master',
  managementToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN,
})
```

## Content Delivery API (CDA) vs Content Management API (CMA)

### CDA - Read Operations

The Content Delivery API is optimized for fast content retrieval:

```typescript
// Read operations use CDA automatically
const posts = await adapter
  .query<Post>('blogPost')
  .where('fields.published', '==', true)
  .getMany()

// Behind the scenes:
// GET /spaces/{space}/environments/{env}/entries?content_type=blogPost&fields.published=true
```

### CMA - Write Operations

The Content Management API is used for mutations:

```typescript
// Mutations use CMA automatically
const post = await adapter.create<Post>('blogPost', {
  title: 'New Post',
  body: 'Content here',
})

// Behind the scenes: Uses contentful-management SDK
// POST /spaces/{space}/environments/{env}/entries
```

## Querying Content

### Basic Queries

```typescript
interface BlogPost extends BaseDocument {
  _type: 'blogPost'
  title: string
  slug: string
  body: unknown
  publishedAt: string
}

// Simple query
const posts = await adapter
  .query<BlogPost>('blogPost')
  .where('fields.published', '==', true)
  .limit(10)
  .getMany()
```

### Field Filtering

Contentful uses `fields.` prefix for custom fields:

```typescript
const posts = await adapter
  .query<BlogPost>('blogPost')
  .where('fields.category', '==', 'Technology')
  .greaterThan('fields.publishedAt', '2024-01-01')
  .getMany()

// Compiles to:
// ?fields.category=Technology&fields.publishedAt[gt]=2024-01-01
```

### System Fields

System fields use `sys.` prefix:

```typescript
const posts = await adapter
  .query<BlogPost>('blogPost')
  .where('sys.createdAt', '>', '2024-01-01')
  .orderBy('sys.updatedAt', 'desc')
  .getMany()
```

### Reference Expansion (Links)

Resolve linked entries:

```typescript
interface BlogPost extends BaseDocument {
  _type: 'blogPost'
  title: string
  author: DocumentReference  // Link to author entry
}

const posts = await adapter
  .query<BlogPost>('blogPost')
  .expand('author', { name: true, bio: true })
  .getMany()

// Contentful includes parameter:
// ?include=2  // Depth of linked entries to resolve
```

### Search and Filtering

Full-text search:

```typescript
const posts = await adapter
  .query<BlogPost>('blogPost')
  .match('fields.title', 'javascript tutorial')
  .getMany()

// Uses Contentful's search:
// ?query=javascript tutorial&content_type=blogPost
```

Array contains:

```typescript
const posts = await adapter
  .query<BlogPost>('blogPost')
  .contains('fields.tags', 'javascript')
  .getMany()

// Contentful array filter:
// ?fields.tags[in]=javascript
```

## Rich Text

Contentful uses its own Rich Text format. ContentBridge converts between Contentful Rich Text and Universal Rich Text.

### Convert from Contentful Rich Text

```typescript
import type { Document } from '@contentful/rich-text-types'

// Contentful Rich Text document
const richText: Document = {
  nodeType: 'document',
  content: [
    {
      nodeType: 'paragraph',
      content: [
        { nodeType: 'text', value: 'Hello ', marks: [] },
        { nodeType: 'text', value: 'World', marks: [{ type: 'bold' }] },
      ],
    },
  ],
}

// Convert to universal format
const universal = await adapter.toUniversalRichText(richText)

// Now you can use any rendering library
const html = renderToHTML(universal.content)
```

### Convert to Contentful Rich Text

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
]

// Convert to Contentful format
const richText = await adapter.fromUniversalRichText({
  _type: 'richtext',
  content: universal,
})

// Save to Contentful
await adapter.create('blogPost', {
  title: 'My Post',
  body: richText,
})
```

### Embedded Entries and Assets

```typescript
// Rich text with embedded entry
const richText = {
  nodeType: 'document',
  content: [
    {
      nodeType: 'embedded-entry-block',
      data: {
        target: {
          sys: { id: 'entry-123', type: 'Entry' },
          fields: { title: 'Embedded Content' },
        },
      },
    },
  ],
}

const universal = await adapter.toUniversalRichText(richText)
// Embedded entries become custom blocks with type: 'embed'
```

## Asset Management

### Image URLs

```typescript
const post = await adapter.getById<BlogPost>('post-123')

// Generate optimized image URL
const imageUrl = await adapter.resolveMediaUrl(post.data.image, {
  width: 800,
  height: 600,
  format: 'webp',
  quality: 80,
  fit: 'fill',
})

// Returns: //images.ctfassets.net/.../image.jpg?w=800&h=600&fm=webp&q=80&fit=fill
```

### Responsive Images

```typescript
const responsiveImage = await adapter.getResponsiveImage(post.data.image, {
  widths: [320, 640, 1024, 1920],
  formats: ['webp', 'jpg'],
  quality: 80,
})

// Use in your template
console.log(responsiveImage.srcset)
// //images.ctfassets.net/.../image.jpg?w=320&fm=webp 320w,
// //images.ctfassets.net/.../image.jpg?w=640&fm=webp 640w,
// ...
```

### Image Transformations

Contentful supports various image parameters:

```typescript
const url = await adapter.resolveMediaUrl(image, {
  width: 800,
  height: 600,
  format: 'webp',  // jpg, png, webp, avif
  quality: 80,  // 1-100
  fit: 'fill',  // fill, pad, crop, scale, thumb
  focus: 'face',  // face, center, top, bottom, left, right, etc.
  radius: 'max',  // rounded corners
  backgroundColor: 'rgb:ffffff',  // background color for pad fit
})
```

## Localization

Contentful has powerful localization built in.

### Query with Locale

```typescript
// Get Spanish content
const posts = await adapter
  .query<BlogPost>('blogPost')
  .locale('es-ES')
  .getMany()

// Behind the scenes:
// ?locale=es-ES
```

### Fallback Locale

```typescript
// Spanish with English fallback
const posts = await adapter
  .query<BlogPost>('blogPost')
  .locale('es-ES', 'en-US')
  .getMany()

// Contentful will return es-ES if available, otherwise en-US
```

### All Locales

Get content in all locales:

```typescript
const deliveryClient = createClient({
  space: 'your-space-id',
  accessToken: 'your-token',
})

// Fetch with all locales
const entry = await deliveryClient.getEntry('entry-id', {
  locale: '*',
})

// Fields will contain all locales:
// entry.fields.title = { 'en-US': 'Hello', 'es-ES': 'Hola' }
```

## Preview Mode

Access draft/unpublished content using the Preview API.

### Setup Preview

```typescript
import { createClient } from 'contentful'

// Preview client
const previewClient = createClient({
  space: 'your-space-id',
  accessToken: 'your-preview-token',  // Different token!
  host: 'preview.contentful.com',  // Preview API host
})

const previewAdapter = createContentfulAdapter(previewClient, {
  spaceId: 'your-space-id',
  environment: 'master',
  previewToken: 'your-preview-token',
})

// Query drafts
const drafts = await previewAdapter
  .query<BlogPost>('blogPost')
  .getMany()  // Includes draft/changed content
```

### Next.js Draft Mode

```typescript
// app/api/preview/route.ts
import { draftMode } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.CONTENTFUL_PREVIEW_SECRET) {
    return new Response('Invalid token', { status: 401 })
  }

  draftMode().enable()
  return new Response('Draft mode enabled')
}

// lib/cms.ts
import { createClient } from 'contentful'
import { draftMode } from 'next/headers'

export function createCMSAdapter() {
  const isDraft = draftMode().isEnabled

  const client = createClient({
    space: process.env.CONTENTFUL_SPACE_ID!,
    accessToken: isDraft
      ? process.env.CONTENTFUL_PREVIEW_TOKEN!
      : process.env.CONTENTFUL_ACCESS_TOKEN!,
    host: isDraft ? 'preview.contentful.com' : 'cdn.contentful.com',
  })

  return createContentfulAdapter(client, {
    spaceId: process.env.CONTENTFUL_SPACE_ID!,
  })
}
```

## Mutations

### Create Entry

```typescript
const post = await adapter.create<BlogPost>('blogPost', {
  title: 'Hello Contentful',
  slug: 'hello-contentful',
  body: richTextDocument,
  publishedAt: new Date().toISOString(),
})

// Entry is created in draft state
```

### Publish Entry

```typescript
// Create and publish in one transaction
await adapter.transaction([
  {
    type: 'create',
    documentType: 'blogPost',
    data: { title: 'New Post', slug: 'new-post' },
    publish: true,  // Contentful-specific option
  },
])
```

### Update Entry

```typescript
const updated = await adapter.update<BlogPost>(post._id, {
  title: 'Updated Title',
})

// Or patch specific fields
const patched = await adapter.patch<BlogPost>(post._id, [
  { op: 'set', path: 'title', value: 'New Title' },
  { op: 'set', path: 'fields.featured', value: true },
])
```

### Delete Entry

```typescript
const deleted = await adapter.delete('entry-id')

// Entry is unpublished and deleted
```

### Working with Drafts

```typescript
// Update draft without publishing
await adapter.update('entry-id', {
  title: 'Draft Title',
})

// Publish when ready
await adapter.publish('entry-id')

// Unpublish
await adapter.unpublish('entry-id')
```

## Content Types

### List Content Types

```typescript
const contentTypes = await adapter.getContentTypes()

contentTypes.forEach(ct => {
  console.log(`${ct.name} (${ct.sys.id})`)
  console.log(`Fields:`, ct.fields.map(f => f.id))
})
```

### Generate Types from Content Types

```typescript
const contentTypes = await adapter.getContentTypes()
const types = await adapter.generateTypes(contentTypes, {
  format: 'typescript',
  strict: true,
})

// Write to file
import fs from 'fs/promises'
await fs.writeFile('types/contentful.generated.ts', types.interfaces)
```

## Best Practices

### 1. Use Delivery API for Reads

```typescript
// Good: Fast CDN-cached reads
const deliveryClient = createClient({
  space: 'abc123',
  accessToken: 'delivery-token',
})

// Bad: Using Management API for reads (slower, rate-limited)
const mgmtClient = createManagementClient({
  accessToken: 'management-token',
})
```

### 2. Limit Include Depth

```typescript
// Good: Only resolve what you need
const posts = await adapter
  .query<BlogPost>('blogPost')
  .expand('author')  // 1 level deep
  .getMany()

// Bad: Deep nesting (slower, more data)
const posts = await adapter
  .query<BlogPost>('blogPost')
  .resolveReferences(5)  // 5 levels deep!
  .getMany()
```

### 3. Select Specific Fields

```typescript
// Good: Only fetch needed fields
const posts = await adapter
  .query<BlogPost>('blogPost')
  .select('fields.title', 'fields.slug', 'sys.id')
  .getMany()

// Bad: Fetching everything
const posts = await adapter
  .query<BlogPost>('blogPost')
  .getMany()
```

### 4. Use Content Preview Wisely

```typescript
// Only use preview API when needed (draft mode, previews)
const usePreview = isDraftMode || isPreviewContext

const client = createClient({
  space: 'abc123',
  accessToken: usePreview ? previewToken : deliveryToken,
  host: usePreview ? 'preview.contentful.com' : 'cdn.contentful.com',
})
```

### 5. Handle Pagination

```typescript
const pageSize = 100
let skip = 0
let allPosts: BlogPost[] = []

while (true) {
  const result = await adapter
    .query<BlogPost>('blogPost')
    .limit(pageSize)
    .offset(skip)
    .getMany()

  allPosts = [...allPosts, ...result.data]

  if (result.data.length < pageSize) break
  skip += pageSize
}
```

## Migration from Contentful SDK

### Before (Direct SDK)

```typescript
import { createClient } from 'contentful'

const client = createClient({
  space: 'abc123',
  accessToken: 'token',
})

// Fetch entries
const response = await client.getEntries({
  content_type: 'blogPost',
  'fields.published': true,
  order: '-fields.publishedAt',
  limit: 10,
})

const posts = response.items
```

### After (ContentBridge)

```typescript
import { createContentfulAdapter } from '@contentbridge/contentful'
import { createClient } from 'contentful'

const client = createClient({
  space: 'abc123',
  accessToken: 'token',
})

const adapter = createContentfulAdapter(client, {
  spaceId: 'abc123',
})

// Type-safe query
const result = await adapter
  .query<BlogPost>('blogPost')
  .where('fields.published', '==', true)
  .orderBy('fields.publishedAt', 'desc')
  .limit(10)
  .getMany()

const posts = result.data
```

### Benefits

- Type safety
- Framework-agnostic
- Portable to other CMSs
- Consistent error handling
- Rich text conversion included

## Troubleshooting

### "Space not found"

Verify your space ID and token:

```typescript
console.log('Space:', process.env.CONTENTFUL_SPACE_ID)
console.log('Has token:', !!process.env.CONTENTFUL_ACCESS_TOKEN)
```

### "Unauthorized"

Make sure you're using the correct token type:

- Delivery token for CDA (reads)
- Preview token for Preview API (drafts)
- Management token for CMA (writes)

### Rate Limits

Contentful has different rate limits for different APIs:

- CDA: 55 requests/second
- Preview API: 14 requests/second
- CMA: 10 requests/second

Implement retry logic or caching to stay within limits.

### Field Names

Remember that Contentful prefixes custom fields with `fields.`:

```typescript
// Correct
.where('fields.title', '==', 'Hello')

// Wrong
.where('title', '==', 'Hello')
```

## Resources

- [Contentful Documentation](https://www.contentful.com/developers/docs/)
- [Content Delivery API](https://www.contentful.com/developers/docs/references/content-delivery-api/)
- [Content Management API](https://www.contentful.com/developers/docs/references/content-management-api/)
- [Rich Text](https://www.contentful.com/developers/docs/concepts/rich-text/)
- [ContentBridge API Reference](../api-reference.md)
