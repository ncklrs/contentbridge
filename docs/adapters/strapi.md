# Strapi Adapter

The Strapi adapter provides a unified ContentBridge interface for [Strapi CMS](https://strapi.io/), supporting both Strapi v4 and v5 REST APIs with full rich text block conversion.

## Installation

```bash
# Install the adapter
pnpm add @contentbridge/strapi

# Install peer dependency (for HTTP requests)
pnpm add axios
```

## Configuration

### Basic Setup

```typescript
import { createStrapiAdapter } from '@contentbridge/strapi'

const adapter = createStrapiAdapter({
  apiUrl: 'http://localhost:1337',
  apiToken: process.env.STRAPI_API_TOKEN,
  version: 'v4',  // or 'v5'
})

await adapter.initialize()
```

### Configuration Options

```typescript
interface StrapiAdapterConfig {
  apiUrl: string  // Strapi server URL
  apiToken?: string  // API token for authentication
  version?: 'v4' | 'v5'  // Strapi version (default: 'v4')
  locale?: string  // Default locale (default: 'en')
  publicationState?: 'live' | 'preview'  // Default: 'live'
}
```

### Environment Variables

```env
STRAPI_API_URL=http://localhost:1337
STRAPI_API_TOKEN=your-api-token
STRAPI_VERSION=v4
```

```typescript
const adapter = createStrapiAdapter({
  apiUrl: process.env.STRAPI_API_URL!,
  apiToken: process.env.STRAPI_API_TOKEN,
  version: (process.env.STRAPI_VERSION as 'v4' | 'v5') || 'v4',
})
```

## Querying Content

### Basic Queries

```typescript
interface Article extends BaseDocument {
  _type: 'articles'
  title: string
  slug: string
  content: unknown[]
  publishedAt: string
  status: 'draft' | 'published'
}

// Simple query
const articles = await adapter
  .query<Article>('articles')
  .where('status', '==', 'published')
  .limit(10)
  .getMany()
```

### Field Filtering

Strapi uses nested filter syntax:

```typescript
const articles = await adapter
  .query<Article>('articles')
  .where('status', '==', 'published')
  .greaterThan('publishedAt', '2024-01-01')
  .contains('tags', 'javascript')
  .getMany()

// Compiles to Strapi filters:
// {
//   filters: {
//     status: { $eq: 'published' },
//     publishedAt: { $gt: '2024-01-01' },
//     tags: { $contains: 'javascript' }
//   }
// }
```

### Population (Relations)

Resolve related content:

```typescript
interface Article extends BaseDocument {
  _type: 'articles'
  title: string
  author: DocumentReference  // Relation to author
}

// Populate author relation
const articles = await adapter
  .query<Article>('articles')
  .expand('author', { name: true, bio: true })
  .getMany()

// Strapi populate parameter:
// ?populate[author][fields][0]=name&populate[author][fields][1]=bio
```

### Deep Population

Control depth of relation resolution:

```typescript
const articles = await adapter
  .query<Article>('articles')
  .resolveReferences(2)  // Populate 2 levels deep
  .getMany()

// Strapi parameter: populate=*&populate[author][populate]=*
```

### Search

Strapi supports full-text search with the `$contains` or `$containsi` operators:

```typescript
const articles = await adapter
  .query<Article>('articles')
  .match('title', 'javascript tutorial')
  .getMany()

// Uses Strapi's search:
// ?filters[title][$containsi]=javascript tutorial
```

### Complex Filters

Combine multiple conditions:

```typescript
const articles = await adapter
  .query<Article>('articles')
  .or([
    { field: 'featured', operator: '==', value: true },
    { field: 'views', operator: '>', value: 10000 }
  ])
  .where('status', '==', 'published')
  .orderBy('publishedAt', 'desc')
  .getMany()

// Strapi filters with $or:
// {
//   filters: {
//     $or: [
//       { featured: { $eq: true } },
//       { views: { $gt: 10000 } }
//     ],
//     status: { $eq: 'published' }
//   }
// }
```

## Rich Text Blocks

Strapi uses a blocks-based rich text format. ContentBridge converts between Strapi blocks and Universal Rich Text.

### Convert from Strapi Blocks

```typescript
// Strapi rich text blocks
const strapiBlocks = [
  {
    type: 'paragraph',
    children: [
      { type: 'text', text: 'Hello ' },
      { type: 'text', text: 'World', bold: true },
    ],
  },
]

// Convert to universal format
const universal = await adapter.toUniversalRichText(strapiBlocks)

// Render with any library
const html = renderToHTML(universal.content)
```

### Convert to Strapi Blocks

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

// Convert to Strapi blocks
const strapiBlocks = await adapter.fromUniversalRichText({
  _type: 'richtext',
  content: universal,
})

// Save to Strapi
await adapter.create('articles', {
  title: 'My Article',
  content: strapiBlocks,
})
```

### Supported Block Types

Strapi supports various block types:

- `paragraph` - Paragraph text
- `heading` - Headings (h1-h6)
- `list` - Ordered and unordered lists
- `quote` - Block quotes
- `code` - Code blocks
- `image` - Embedded images
- `link` - Hyperlinks

```typescript
const blocks = [
  { type: 'heading', level: 1, children: [{ type: 'text', text: 'Title' }] },
  { type: 'paragraph', children: [{ type: 'text', text: 'Content' }] },
  { type: 'code', children: [{ type: 'text', text: 'const x = 1' }] },
]
```

## Media Library

Strapi has a built-in media library for file uploads.

### Upload Files

```typescript
// Upload a file to Strapi
const formData = new FormData()
formData.append('files', fileBlob, 'image.jpg')

const response = await fetch(`${apiUrl}/api/upload`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiToken}`,
  },
  body: formData,
})

const [uploadedFile] = await response.json()

// Use in content
await adapter.create('articles', {
  title: 'Article with Image',
  coverImage: uploadedFile.id,  // Reference to uploaded file
})
```

### Image URLs

```typescript
const article = await adapter.getById<Article>('article-123')

// Get image URL with transforms
const imageUrl = await adapter.resolveMediaUrl(article.data.coverImage, {
  width: 800,
  height: 600,
  format: 'webp',
  quality: 80,
})

// Strapi image transformation URL
// /uploads/thumbnail_image_800x600_abc123.webp
```

### Responsive Images

```typescript
const responsiveImage = await adapter.getResponsiveImage(
  article.data.coverImage,
  {
    widths: [320, 640, 1024, 1920],
    formats: ['webp', 'jpg'],
    quality: 80,
  }
)

// Use in your template
const html = `
  <picture>
    ${responsiveImage.sources.map(source => `
      <source srcset="${source.srcset}" type="${source.type}" />
    `).join('')}
    <img src="${responsiveImage.src}" alt="${article.data.title}" />
  </picture>
`
```

## Internationalization (i18n)

Strapi has comprehensive i18n support.

### Query with Locale

```typescript
// Get Spanish content
const articles = await adapter
  .query<Article>('articles')
  .locale('es')
  .getMany()

// Strapi parameter: ?locale=es
```

### Fallback Locale

```typescript
// Spanish with English fallback
const articles = await adapter
  .query<Article>('articles')
  .locale('es', 'en')
  .getMany()

// If es translation doesn't exist, return en
```

### All Localizations

```typescript
// Get all localizations of an article
const article = await adapter.getById<Article>('article-123', {
  locale: 'all',
})

// Response includes localizations array
article.localizations.forEach(loc => {
  console.log(`${loc.locale}: ${loc.title}`)
})
```

## Draft & Publish

Strapi's draft/publish workflow is supported.

### Publication State

```typescript
// Published content only (default)
const adapter = createStrapiAdapter({
  apiUrl: 'http://localhost:1337',
  apiToken: process.env.STRAPI_API_TOKEN,
  publicationState: 'live',
})

// Include preview/draft content
const previewAdapter = createStrapiAdapter({
  apiUrl: 'http://localhost:1337',
  apiToken: process.env.STRAPI_API_TOKEN,
  publicationState: 'preview',
})

const drafts = await previewAdapter
  .query<Article>('articles')
  .getMany()  // Includes draft/unpublished content
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

export function createCMSAdapter() {
  const isDraft = draftMode().isEnabled

  return createStrapiAdapter({
    apiUrl: process.env.STRAPI_API_URL!,
    apiToken: process.env.STRAPI_API_TOKEN,
    publicationState: isDraft ? 'preview' : 'live',
  })
}
```

## Mutations

### Create Entry

```typescript
const article = await adapter.create<Article>('articles', {
  title: 'Hello Strapi',
  slug: 'hello-strapi',
  content: strapiBlocks,
  status: 'draft',
})

// Entry is created in draft state
```

### Publish Entry

```typescript
// Create and publish
await adapter.transaction([
  {
    type: 'create',
    documentType: 'articles',
    data: { title: 'New Article', slug: 'new-article' },
    publish: true,  // Strapi-specific option
  },
])
```

### Update Entry

```typescript
// Full update
const updated = await adapter.update<Article>(article.id, {
  title: 'Updated Title',
  status: 'published',
})

// Partial update (patch)
const patched = await adapter.patch<Article>(article.id, [
  { op: 'set', path: 'title', value: 'New Title' },
  { op: 'set', path: 'featured', value: true },
])
```

### Delete Entry

```typescript
const deleted = await adapter.delete<Article>('article-123')
console.log(`Deleted: ${deleted.title}`)
```

## Authentication

Strapi supports multiple authentication methods.

### API Tokens

Recommended for server-side usage:

```typescript
const adapter = createStrapiAdapter({
  apiUrl: 'http://localhost:1337',
  apiToken: process.env.STRAPI_API_TOKEN,  // Full access token
})
```

### User Authentication (JWT)

For client-side or user-specific access:

```typescript
// Login user
const response = await fetch('http://localhost:1337/api/auth/local', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    identifier: 'user@example.com',
    password: 'password',
  }),
})

const { jwt } = await response.json()

// Use JWT token
const adapter = createStrapiAdapter({
  apiUrl: 'http://localhost:1337',
  apiToken: jwt,
})
```

## Permissions

Strapi's role-based permissions are respected by the adapter.

### Public Access

```typescript
// No token = public access only
const adapter = createStrapiAdapter({
  apiUrl: 'http://localhost:1337',
  // No apiToken
})

// Only returns publicly accessible content
const articles = await adapter
  .query<Article>('articles')
  .getMany()
```

### Authenticated Access

```typescript
// With token = authenticated access
const adapter = createStrapiAdapter({
  apiUrl: 'http://localhost:1337',
  apiToken: process.env.STRAPI_API_TOKEN,
})

// Returns content based on token permissions
const articles = await adapter
  .query<Article>('articles')
  .getMany()
```

## Webhooks

Strapi webhooks can trigger cache invalidation:

```typescript
// app/api/webhook/route.ts (Next.js)
import { createStrapiAdapter } from '@contentbridge/strapi'

export async function POST(request: Request) {
  const body = await request.json()

  // Verify webhook signature
  // ...

  const adapter = createStrapiAdapter({ /* config */ })

  // Invalidate cache for updated content
  if (body.event === 'entry.update') {
    await adapter.invalidateCache([body.model])
  }

  return new Response('OK')
}
```

## Best Practices

### 1. Use API Tokens

```typescript
// Good: API token for server-side
const adapter = createStrapiAdapter({
  apiUrl: 'http://localhost:1337',
  apiToken: process.env.STRAPI_API_TOKEN,
})

// Bad: Hardcoded credentials
const adapter = createStrapiAdapter({
  apiUrl: 'http://localhost:1337',
  apiToken: 'sk_hardcoded_token',  // Don't do this!
})
```

### 2. Limit Population Depth

```typescript
// Good: Only populate what you need
const articles = await adapter
  .query<Article>('articles')
  .expand('author')  // 1 level
  .getMany()

// Bad: Deep population (slow)
const articles = await adapter
  .query<Article>('articles')
  .resolveReferences(5)  // 5 levels!
  .getMany()
```

### 3. Select Specific Fields

```typescript
// Good: Only fetch needed fields
const articles = await adapter
  .query<Article>('articles')
  .select('title', 'slug', 'publishedAt')
  .getMany()

// Bad: Fetching everything
const articles = await adapter
  .query<Article>('articles')
  .getMany()
```

### 4. Cache Queries

```typescript
const articles = await adapter
  .query<Article>('articles')
  .where('status', '==', 'published')
  .tags('articles', 'published')
  .ttl(3600)  // Cache for 1 hour
  .getMany()
```

### 5. Handle Pagination

```typescript
// Paginate large collections
const page = 1
const pageSize = 25

const articles = await adapter
  .query<Article>('articles')
  .limit(pageSize)
  .offset((page - 1) * pageSize)
  .getMany()
```

## Migration from Strapi SDK

### Before (Direct Strapi)

```typescript
import axios from 'axios'

const apiUrl = 'http://localhost:1337'
const apiToken = process.env.STRAPI_API_TOKEN

// Fetch articles
const response = await axios.get(`${apiUrl}/api/articles`, {
  headers: {
    Authorization: `Bearer ${apiToken}`,
  },
  params: {
    filters: {
      status: { $eq: 'published' },
    },
    sort: 'publishedAt:desc',
    pagination: { limit: 10 },
  },
})

const articles = response.data.data
```

### After (ContentBridge)

```typescript
import { createStrapiAdapter } from '@contentbridge/strapi'

const adapter = createStrapiAdapter({
  apiUrl: 'http://localhost:1337',
  apiToken: process.env.STRAPI_API_TOKEN,
})

// Type-safe query
const result = await adapter
  .query<Article>('articles')
  .where('status', '==', 'published')
  .orderBy('publishedAt', 'desc')
  .limit(10)
  .getMany()

const articles = result.data
```

### Benefits

- Type safety with TypeScript
- No manual REST API calls
- Portable to other CMSs
- Consistent error handling
- Rich text conversion included

## Troubleshooting

### "Forbidden"

Check your API token permissions in Strapi admin:

1. Go to Settings → API Tokens
2. Verify token has correct permissions for the content type
3. Ensure token is not expired

### "Content type not found"

Verify the content type API ID matches:

```typescript
// In Strapi admin, check API ID (plural)
// Content type: "Article" → API ID: "articles"

const articles = await adapter
  .query<Article>('articles')  // Must match API ID
  .getMany()
```

### Population Not Working

Make sure relations are properly configured in Strapi:

1. Go to Content-Type Builder
2. Select your content type
3. Verify relation fields are set up correctly

### CORS Errors

Configure CORS in Strapi config:

```typescript
// config/middlewares.ts
export default [
  'strapi::cors',  // Enable CORS
  // ...
]
```

## Resources

- [Strapi Documentation](https://docs.strapi.io/)
- [Strapi REST API](https://docs.strapi.io/dev-docs/api/rest)
- [Rich Text (Blocks)](https://docs.strapi.io/dev-docs/api/document/blocks)
- [i18n Plugin](https://docs.strapi.io/dev-docs/plugins/i18n)
- [ContentBridge API Reference](../api-reference.md)
