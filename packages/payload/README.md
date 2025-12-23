# @contentbridge/payload

Payload CMS adapter for ContentBridge - provides REST/Local API integration and Slate rich text conversion.

## Features

- ✅ **Dual API Support**: Works with both REST API and Local API modes
- ✅ **Query Compilation**: Converts universal QueryConfig to Payload's where/sort/limit format
- ✅ **Rich Text Conversion**: Bidirectional conversion between Slate and Universal RichText
- ✅ **Type-Safe**: Full TypeScript support with comprehensive type definitions
- ✅ **Media Handling**: Built-in image transformation and responsive image generation
- ✅ **Localization**: Support for localized content with fallback handling

## Installation

```bash
npm install @contentbridge/payload payload
# or
yarn add @contentbridge/payload payload
# or
pnpm add @contentbridge/payload payload
```

## Quick Start

### REST API Mode

```typescript
import { createPayloadAdapter } from '@contentbridge/payload'

const adapter = createPayloadAdapter({
  mode: 'rest',
  serverURL: 'https://api.example.com',
  apiKey: process.env.PAYLOAD_API_KEY,
  locale: 'en',
})

// Query documents
const posts = await adapter.executeQuery({
  type: 'posts',
  filter: [
    { field: 'status', operator: '==', value: 'published' }
  ],
  limit: 10,
  orderBy: [{ field: 'publishedAt', direction: 'desc' }]
})

console.log(posts.data)
```

### Local API Mode

```typescript
import { createPayloadAdapter } from '@contentbridge/payload'
import payload from 'payload'

// Initialize Payload first
await payload.init({
  secret: process.env.PAYLOAD_SECRET,
  mongoURL: process.env.MONGODB_URI,
  local: true,
})

const adapter = createPayloadAdapter({
  mode: 'local',
  payload, // Pass Payload instance
  locale: 'en',
})

// Use the same API as REST mode
const posts = await adapter.executeQuery({
  type: 'posts',
  filter: [
    { field: 'featured', operator: '==', value: true }
  ],
})
```

## Core Concepts

### Query Compilation

The adapter compiles universal QueryConfig objects to Payload's query format:

```typescript
import { QueryCompiler } from '@contentbridge/payload'

const compiler = new QueryCompiler()

const compiled = compiler.compile({
  type: 'posts',
  filter: [
    { field: 'status', operator: '==', value: 'published' },
    { field: 'views', operator: '>', value: 1000 },
  ],
  orderBy: [{ field: 'createdAt', direction: 'desc' }],
  limit: 20,
  offset: 40,
})

// Result:
// {
//   collection: 'posts',
//   where: {
//     and: [
//       { status: { equals: 'published' } },
//       { views: { greater_than: 1000 } }
//     ]
//   },
//   sort: '-createdAt',
//   limit: 20,
//   page: 3
// }
```

### Filter Operators

Supported operators map to Payload's where clause operators:

| Universal | Payload | Description |
|-----------|---------|-------------|
| `==` | `equals` | Exact match |
| `!=` | `not_equals` | Not equal |
| `>` | `greater_than` | Greater than |
| `>=` | `greater_than_equal` | Greater or equal |
| `<` | `less_than` | Less than |
| `<=` | `less_than_equal` | Less or equal |
| `in` | `in` | Value in array |
| `nin` | `not_in` | Value not in array |
| `contains` | `contains` / `in` | String contains or array contains |
| `containsAll` | `all` | Array contains all values |
| `match` | `like` | Full-text search |
| `startsWith` | `like` with `%` | String starts with |
| `endsWith` | `like` with `%` | String ends with |
| `defined` | `exists: true` | Field exists |
| `undefined` | `exists: false` | Field doesn't exist |
| `references` | `equals` | Reference match |

### Rich Text Conversion

Convert between Payload's Slate format and Universal RichText:

```typescript
import { SlateConverter } from '@contentbridge/payload'

const converter = new SlateConverter()

// Payload Slate format
const slateContent = [
  {
    type: 'h1',
    children: [
      { text: 'Hello ' },
      { text: 'World', bold: true }
    ]
  },
  {
    type: 'p',
    children: [
      { text: 'This is a ' },
      {
        type: 'link',
        url: 'https://example.com',
        children: [{ text: 'link' }]
      }
    ]
  }
]

// Convert to Universal format
const universal = converter.fromSlate(slateContent)

// Convert back to Slate
const slate = converter.toSlate(universal)
```

### Supported Slate Elements

- Text blocks: `p`, `h1`-`h6`, `blockquote`
- Lists: `ul`, `ol`, `li`
- Inline: `link` (with URL and newTab properties)
- Marks: `bold`, `italic`, `underline`, `strikethrough`, `code`
- Media: `upload` (images/files via relationship)
- Code: `code` blocks with language

## API Reference

### PayloadAdapter

Main adapter class extending BaseAdapter.

#### Constructor Options

```typescript
interface PayloadAdapterConfig {
  // API mode
  mode?: 'rest' | 'local' // default: 'rest'

  // REST mode options
  serverURL?: string       // Required for REST
  apiKey?: string         // Optional API key

  // Local mode options
  payload?: Payload       // Required for Local API

  // Localization
  locale?: string
  fallbackLocale?: string

  // Query configuration
  queryConfig?: PayloadQueryConfig

  // BaseAdapter options
  logger?: Logger
  debug?: boolean
}
```

#### Methods

All methods from BaseAdapter are implemented:

**Query Methods:**
- `compileQuery<T>(config: QueryConfig<T>): Promise<object>`
- `executeQuery<T>(config: QueryConfig<T>): Promise<QueryResult<T>>`
- `count(config: QueryConfig): Promise<number>`
- `getById<T>(id: string, options?): Promise<SingleResult<T>>`

**Mutation Methods:**
- `create<T>(documentType: string, data): Promise<T>`
- `update<T>(id: string, data): Promise<T>`
- `patch<T>(id: string, patches): Promise<T>`
- `delete<T>(id: string): Promise<T>`
- `transaction(operations): Promise<TransactionResult>`

**Rich Text Methods:**
- `toUniversalRichText(nativeContent): Promise<UniversalRichText>`
- `fromUniversalRichText(universalContent): Promise<unknown>`

**Media Methods:**
- `resolveMediaUrl(assetRef, options?): Promise<string>`
- `getResponsiveImage(assetRef, options): Promise<ResponsiveImageSet>`
- `getPlaceholder(assetRef, options): Promise<string>`

**Utility Methods:**
- `getPayload(): unknown` - Get Payload instance (Local API mode)
- `getCompiler(): QueryCompiler` - Get query compiler
- `getSlateConverter(): SlateConverter` - Get Slate converter

### QueryCompiler

Compiles universal queries to Payload format.

```typescript
import { QueryCompiler } from '@contentbridge/payload'

const compiler = new QueryCompiler({
  defaultLocale: 'en',
  fallbackLocales: ['en-US', 'en'],
  includeDrafts: false,
})

// Compile to Payload query
const query = compiler.compile(queryConfig)

// Get REST params
const restParams = compiler.toRESTParams(query)

// Get Local API options
const localOptions = compiler.toLocalAPIOptions(query)
```

### SlateConverter

Converts between Slate and Universal RichText.

```typescript
import { SlateConverter, fromSlate, toSlate } from '@contentbridge/payload'

// Using class
const converter = new SlateConverter()
const universal = converter.fromSlate(slateNodes)
const slate = converter.toSlate(universalContent)

// Using convenience functions
const universal = fromSlate(slateNodes)
const slate = toSlate(universalContent)
```

## Examples

### Complex Filtering

```typescript
const results = await adapter.executeQuery({
  type: 'articles',
  filter: [
    {
      or: [
        { field: 'category', operator: '==', value: 'technology' },
        { field: 'category', operator: '==', value: 'science' },
      ]
    },
    { field: 'published', operator: '==', value: true },
    { field: 'views', operator: '>=', value: 100 },
  ],
  orderBy: [
    { field: 'featured', direction: 'desc' },
    { field: 'publishedAt', direction: 'desc' },
  ],
  limit: 10,
  resolveReferences: 2, // Populate relationships 2 levels deep
})
```

### Localized Content

```typescript
const adapter = createPayloadAdapter({
  mode: 'rest',
  serverURL: 'https://api.example.com',
  locale: 'de',
  fallbackLocale: 'en',
})

const posts = await adapter.executeQuery({
  type: 'posts',
  locale: 'de', // Query German content
  fallbackLocale: 'en', // Fall back to English if not available
})
```

### Media Transformations

```typescript
// Get optimized image URL
const imageUrl = await adapter.resolveMediaUrl(
  { _ref: 'media-123' },
  {
    width: 800,
    height: 600,
    format: 'webp',
    quality: 85,
    fit: 'crop',
  }
)

// Generate responsive image set
const responsiveImage = await adapter.getResponsiveImage(
  { _ref: 'media-123' },
  {
    widths: [400, 800, 1200, 1600],
    formats: ['webp', 'jpg'],
    quality: 80,
  }
)

// Use in HTML
console.log(`
  <picture>
    ${responsiveImage.sources.map(source => `
      <source srcset="${source.srcset}" type="${source.type}">
    `).join('')}
    <img src="${responsiveImage.src}" alt="Image">
  </picture>
`)
```

### Document ID Format

Payload adapter supports flexible ID formats:

```typescript
// Simple ID (uses default collection)
await adapter.getById('doc-123')

// Collection/ID format
await adapter.getById('posts/doc-123')

// Same for mutations
await adapter.update('posts/doc-123', { title: 'Updated' })
await adapter.delete('posts/doc-123')
```

## Error Handling

```typescript
try {
  const post = await adapter.getById('posts/invalid-id')
  if (!post.data) {
    console.log('Post not found')
  }
} catch (error) {
  console.error('API error:', error)
}
```

## TypeScript Support

Full TypeScript support with comprehensive types:

```typescript
import type { PayloadAdapterConfig } from '@contentbridge/payload'
import type { QueryConfig, BaseDocument } from '@contentbridge/core'

interface Post extends BaseDocument {
  _type: 'post'
  title: string
  slug: string
  body: unknown[] // Slate content
  status: 'draft' | 'published'
}

const query: QueryConfig<Post> = {
  type: 'posts',
  filter: [
    { field: 'status', operator: '==', value: 'published' }
  ],
}

const result = await adapter.executeQuery<Post>(query)
// result.data is Post[]
```

## Advanced Usage

### Custom Query Compiler

```typescript
import { QueryCompiler } from '@contentbridge/payload'

const compiler = new QueryCompiler({
  defaultLocale: 'en',
  includeDrafts: false,
  globalFilter: {
    // Add a global filter to all queries
    deletedAt: { exists: false }
  },
})

const adapter = createPayloadAdapter({
  mode: 'rest',
  serverURL: 'https://api.example.com',
  queryConfig: {
    defaultLocale: 'en',
    includeDrafts: false,
    globalFilter: { deletedAt: { exists: false } },
  },
})
```

### Direct Payload Access (Local API)

```typescript
const adapter = createPayloadAdapter({
  mode: 'local',
  payload,
})

// Access Payload instance directly for advanced operations
const payloadInstance = adapter.getPayload()

// Use Payload's native API when needed
const customResult = await (payloadInstance as any).find({
  collection: 'posts',
  // ... custom Payload-specific options
})
```

## Limitations

- **Transactions**: Payload doesn't support atomic transactions. Operations are executed sequentially.
- **Patch Operations**: Limited support - only `set` and `unset` are fully supported.
- **Type Generation**: Not yet implemented (generateTypes/generateZodSchemas methods).
- **Cursor Pagination**: Payload uses page-based pagination; cursor-based pagination is converted to pages.

## Contributing

Issues and PRs welcome! Please see the main ContentBridge repository.

## License

MIT
