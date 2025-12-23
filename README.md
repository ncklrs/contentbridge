# ContentBridge

**Universal content abstraction layer for headless CMS platforms.**

Tired of CMS vendor lock-in? ContentBridge provides a unified, type-safe interface for querying and mutating content across Sanity, Contentful, Payload, Strapi, and more. Switch CMSs without rewriting your application code.

[![CI](https://github.com/ncklrs/contentbridge/actions/workflows/ci.yml/badge.svg)](https://github.com/ncklrs/contentbridge/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@contentbridge/core.svg)](https://www.npmjs.com/package/@contentbridge/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/ncklrs/contentbridge/blob/main/.github/CONTRIBUTING.md)

## Why ContentBridge?

- **No vendor lock-in**: Switch between CMSs by changing only the adapter import
- **Full CRUD operations**: Unlike read-only solutions, ContentBridge supports create, update, and delete
- **Type-safe by default**: Comprehensive TypeScript support with generics throughout
- **Framework-agnostic**: Works with Next.js, Astro, Remix, Nuxt, and any JavaScript framework
- **Fluent query API**: Intuitive chainable methods for building complex queries
- **Universal rich text**: Convert between Portable Text, Slate, Contentful Rich Text seamlessly

## Installation

```bash
# Core package (required)
pnpm add @contentbridge/core

# Pick your CMS adapter(s)
pnpm add @contentbridge/sanity    # For Sanity
pnpm add @contentbridge/payload   # For Payload CMS
pnpm add @contentbridge/contentful # For Contentful
pnpm add @contentbridge/strapi    # For Strapi
```

## Quick Start

### 1. Create an Adapter

```typescript
// Using Sanity
import { createSanityAdapter } from '@contentbridge/sanity'

const adapter = createSanityAdapter({
  projectId: 'your-project-id',
  dataset: 'production',
  apiVersion: '2024-01-01',
})

await adapter.initialize()
```

### 2. Query Content

```typescript
// Fluent query builder
const posts = await adapter
  .query<Post>('post')
  .where('status', '==', 'published')
  .orderBy('publishedAt', 'desc')
  .limit(10)
  .cache({ tags: ['posts'], ttl: 3600 })
  .getMany()

// Or use QueryConfig directly
const result = await adapter.executeQuery<Post>({
  type: 'post',
  filter: [
    { field: 'status', operator: '==', value: 'published' },
    { field: 'featured', operator: '==', value: true },
  ],
  orderBy: [{ field: 'publishedAt', direction: 'desc' }],
  limit: 10,
})
```

### 3. Create & Update Content

```typescript
// Create a document
const newPost = await adapter.create<Post>('post', {
  title: 'Hello World',
  slug: { current: 'hello-world' },
  content: [],
})

// Update a document
const updated = await adapter.update<Post>(newPost._id, {
  title: 'Hello ContentBridge',
})

// Patch specific fields
await adapter.patch(newPost._id, [
  { op: 'set', path: 'featured', value: true },
  { op: 'inc', path: 'views', value: 1 },
])
```

## Packages

| Package | Description |
|---------|-------------|
| [`@contentbridge/core`](./packages/core) | Core types, interfaces, and utilities |
| [`@contentbridge/sanity`](./packages/sanity) | Sanity CMS adapter with GROQ compilation |
| [`@contentbridge/payload`](./packages/payload) | Payload CMS adapter (REST & Local API) |
| [`@contentbridge/contentful`](./packages/contentful) | Contentful adapter (Delivery & Management APIs) |
| [`@contentbridge/strapi`](./packages/strapi) | Strapi v4/v5 adapter |

## Features

### Universal Query Builder

Build type-safe queries that compile to any CMS format:

```typescript
const query = adapter
  .query<Post>('post')
  .where('status', '==', 'published')
  .where('publishedAt', '<=', new Date().toISOString())
  .contains('tags', 'javascript')
  .orderBy('publishedAt', 'desc')
  .limit(20)
  .offset(0)
  .select('title', 'slug', 'excerpt', 'author')
  .expand('author', { name: true, image: true })
  .locale('es', 'en')  // With fallback
  .cache({ tags: ['posts'], revalidate: 60 })

const posts = await query.getMany()
```

### Supported Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `==` | Equal | `.where('status', '==', 'published')` |
| `!=` | Not equal | `.where('status', '!=', 'draft')` |
| `>`, `>=`, `<`, `<=` | Comparison | `.where('views', '>', 100)` |
| `in` | Value in array | `.in('status', ['published', 'featured'])` |
| `nin` | Value not in array | `.notIn('status', ['draft', 'archived'])` |
| `contains` | Array contains | `.contains('tags', 'javascript')` |
| `containsAny` | Contains any | `.containsAny('tags', ['js', 'ts'])` |
| `containsAll` | Contains all | `.containsAll('tags', ['js', 'featured'])` |
| `match` | Full-text search | `.match('title', 'javascript tutorial')` |
| `startsWith` | String prefix | `.startsWith('slug', 'blog-')` |
| `endsWith` | String suffix | `.endsWith('email', '@example.com')` |
| `defined` | Field exists | `.defined('publishedAt')` |
| `undefined` | Field missing | `.undefined('archivedAt')` |
| `references` | Document ref | `.references('author', 'author-123')` |

### Universal Rich Text

Convert between CMS-specific rich text formats:

```typescript
import { UniversalBlock } from '@contentbridge/core'

// Convert from CMS format to universal
const blocks: UniversalBlock[] = adapter.toUniversalRichText(sanityPortableText)

// Convert back to CMS format
const portableText = adapter.fromUniversalRichText(blocks)
```

### Media Handling

```typescript
// Resolve image URL with transforms
const imageUrl = adapter.resolveMediaUrl(image, {
  width: 800,
  height: 600,
  format: 'webp',
  quality: 80,
})

// Get responsive image set
const responsive = adapter.getResponsiveImage(image, [320, 640, 1024, 1920])
// { srcSet: '...', sizes: '...', src: '...' }
```

### Transactions

```typescript
const result = await adapter.transaction([
  { op: 'create', type: 'post', data: { title: 'New Post' } },
  { op: 'update', id: 'existing-123', data: { featured: true } },
  { op: 'delete', id: 'old-456' },
])
```

## Switching CMSs

The power of ContentBridge is seamless CMS switching:

```typescript
// Before: Sanity
import { createSanityAdapter } from '@contentbridge/sanity'
const adapter = createSanityAdapter({ /* sanity config */ })

// After: Payload (same application code!)
import { createPayloadAdapter } from '@contentbridge/payload'
const adapter = createPayloadAdapter({ /* payload config */ })

// Your queries and mutations work unchanged
const posts = await adapter.query<Post>('post').getMany()
```

## Type Generation

Generate TypeScript types from your CMS schemas:

```typescript
// Coming soon in @contentbridge/cli
await adapter.generateTypes({ outDir: './types' })
await adapter.generateZodSchemas({ outDir: './schemas' })
```

## Architecture

```
@contentbridge/core
├── types/         # Universal interfaces (document, query, richtext, media)
├── service/       # ContentService, QueryBuilder, MutationBuilder
├── adapters/      # BaseAdapter abstract class
├── cache/         # Cache strategies (Memory, Next.js)
├── plugins/       # Plugin system with built-in plugins
└── utils/         # Errors, logging

@contentbridge/{sanity,payload,contentful,strapi}
├── *Adapter.ts          # BaseAdapter implementation
├── query/               # Query compiler (→ GROQ, REST params, etc.)
└── richtext/            # Rich text converter

@contentbridge/cli
├── commands/      # init, typegen commands
└── typegen/       # TypeScript type generator
```

## Comparison

| Feature | ContentBridge | Astro Content Layer | Contentlayer |
|---------|---------------|---------------------|--------------|
| Read operations | ✅ | ✅ | ✅ |
| Write operations | ✅ | ❌ | ❌ |
| Multiple CMSs | ✅ | ✅ | ❌ |
| Framework agnostic | ✅ | ❌ (Astro only) | ❌ (Next only) |
| Active development | ✅ | ✅ | ❌ (unmaintained) |
| TypeScript | ✅ | ✅ | ✅ |
| Rich text conversion | ✅ | ❌ | ❌ |

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Development mode
pnpm dev
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

### Adding a New Adapter

1. Create a new package in `packages/`
2. Extend `BaseAdapter` from `@contentbridge/core`
3. Implement all abstract methods
4. Add a query compiler for your CMS's query language
5. Add a rich text converter (if applicable)

## License

MIT

---

Built with TypeScript. Designed for freedom from vendor lock-in.
