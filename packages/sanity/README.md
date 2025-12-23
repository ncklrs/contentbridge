# @contentbridge/sanity

Sanity CMS adapter for ContentBridge - provides unified content operations with GROQ query compilation and Portable Text conversion.

## Installation

```bash
# Install the adapter
pnpm add @contentbridge/sanity

# Install peer dependencies
pnpm add @sanity/client @sanity/image-url
```

## Quick Start

```typescript
import { createSanityAdapter } from '@contentbridge/sanity'
import { createClient } from '@sanity/client'

// Create Sanity client
const client = createClient({
  projectId: 'your-project-id',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
  token: 'your-api-token',  // Required for mutations
})

// Create adapter
const adapter = createSanityAdapter(client, {
  projectId: 'your-project-id',
  dataset: 'production',
})

await adapter.initialize()

// Query content
const posts = await adapter
  .query<Post>('post')
  .where('status', '==', 'published')
  .orderBy('publishedAt', 'desc')
  .limit(10)
  .getMany()
```

## Features

- **GROQ Compilation** - ContentBridge queries compile to GROQ automatically
- **Portable Text** - Convert between Portable Text and Universal Rich Text
- **Image API** - Full support for Sanity's Image API with transformations
- **Draft Mode** - Preview unpublished content
- **Type Safe** - Full TypeScript support with generics
- **Transactions** - Atomic mutations with automatic rollback

## Configuration

### SanityAdapterConfig

```typescript
interface SanityAdapterConfig {
  projectId: string
  dataset: string
  apiVersion?: string  // Default: '2024-01-01'
  token?: string  // Required for write operations
  useCdn?: boolean  // Default: true
  perspective?: 'published' | 'previewDrafts' | 'raw'  // Default: 'published'
  groqConfig?: GROQCompilerConfig  // Advanced GROQ options
}
```

## Usage Examples

### Basic Query

```typescript
interface Post extends BaseDocument {
  _type: 'post'
  title: string
  slug: { current: string }
  content: unknown[]
}

const posts = await adapter
  .query<Post>('post')
  .where('status', '==', 'published')
  .getMany()
```

### GROQ Compilation

```typescript
// ContentBridge query
const posts = await adapter
  .query<Post>('post')
  .where('status', '==', 'published')
  .contains('tags', 'javascript')
  .orderBy('publishedAt', 'desc')
  .limit(10)
  .getMany()

// Compiled to GROQ:
// *[_type == 'post' && status == 'published' && 'javascript' in tags]
// | order(publishedAt desc)[0...10]
```

### Reference Expansion

```typescript
const posts = await adapter
  .query<Post>('post')
  .expand('author', { name: true, image: true })
  .getMany()

// GROQ: *[_type == 'post'] { ..., author-> { name, image } }
```

### Portable Text

```typescript
// Convert Sanity Portable Text to Universal format
const universal = await adapter.toUniversalRichText(portableText)

// Convert Universal Rich Text to Portable Text
const portableText = await adapter.fromUniversalRichText(universal)
```

### Image Transformations

```typescript
const imageUrl = await adapter.resolveMediaUrl(image, {
  width: 800,
  height: 600,
  format: 'webp',
  quality: 80,
  fit: 'crop',
})

// Returns: https://cdn.sanity.io/images/.../image-800x600.webp?q=80
```

### Responsive Images

```typescript
const responsiveImage = await adapter.getResponsiveImage(image, {
  widths: [320, 640, 1024, 1920],
  formats: ['webp', 'jpg'],
})

console.log(responsiveImage.srcset)
// image-320.webp 320w, image-640.webp 640w, ...
```

### Create Document

```typescript
const post = await adapter.create<Post>('post', {
  title: 'Hello Sanity',
  slug: { _type: 'slug', current: 'hello-sanity' },
  content: [],
})
```

### Update Document

```typescript
const updated = await adapter.update<Post>('post-123', {
  title: 'Updated Title',
})

// Or patch specific fields
const patched = await adapter.patch<Post>('post-123', [
  { op: 'set', path: 'title', value: 'New Title' },
  { op: 'inc', path: 'views', value: 1 },
])
```

### Transactions

```typescript
const result = await adapter.transaction([
  { type: 'create', documentType: 'author', data: { name: 'Jane' } },
  { type: 'create', documentType: 'post', data: { title: 'Post by Jane' } },
])
```

## Draft Mode

Preview unpublished content:

```typescript
const adapter = createSanityAdapter(client, {
  projectId: 'abc123',
  dataset: 'production',
  perspective: 'previewDrafts',  // Include drafts
  useCdn: false,  // Don't use CDN for drafts
})

const drafts = await adapter
  .query<Post>('post')
  .getMany()  // Includes draft documents
```

## Advanced GROQ

Access compiled GROQ for debugging or custom queries:

```typescript
const groq = await adapter.compileQuery({
  type: 'post',
  filter: [{ field: 'status', operator: '==', value: 'published' }],
  limit: 10,
})

console.log(groq)
// *[_type == 'post' && status == 'published'][0...10]
```

## Exports

### Main Adapter

```typescript
import { createSanityAdapter, SanityAdapter } from '@contentbridge/sanity'
```

### GROQ Utilities

```typescript
import { QueryCompiler, type GROQCompilerConfig } from '@contentbridge/sanity/groq'
```

### Rich Text

```typescript
import { PortableTextConverter } from '@contentbridge/sanity/richtext'
```

## Type Safety

Full TypeScript support:

```typescript
interface Post extends BaseDocument {
  _type: 'post'
  title: string
  views: number
}

const posts = await adapter
  .query<Post>('post')
  .where('title', '==', 'Hello')  // ✓ Type-safe
  .where('invalid', '==', 'x')  // ✗ TypeScript error
  .getMany()

posts.data.forEach(post => {
  console.log(post.title)  // ✓ string
  console.log(post.views)  // ✓ number
})
```

## Best Practices

1. **Use CDN for Production**
   ```typescript
   useCdn: process.env.NODE_ENV === 'production'
   ```

2. **Cache Queries**
   ```typescript
   .tags('posts').ttl(3600)
   ```

3. **Select Specific Fields**
   ```typescript
   .select('title', 'slug', 'excerpt')
   ```

4. **Use Transactions for Related Mutations**
   ```typescript
   await adapter.transaction([...])
   ```

## Documentation

- [Complete Sanity Adapter Guide](../../docs/adapters/sanity.md)
- [API Reference](../../docs/api-reference.md)
- [Getting Started](../../docs/getting-started.md)

## Resources

- [Sanity Documentation](https://www.sanity.io/docs)
- [GROQ Reference](https://www.sanity.io/docs/groq)
- [Portable Text](https://portabletext.org/)

## License

MIT

---

Part of the [ContentBridge](https://github.com/contentbridge/contentbridge) monorepo.
