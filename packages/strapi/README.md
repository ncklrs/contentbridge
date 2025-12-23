# @contentbridge/strapi

Strapi CMS adapter for ContentBridge - provides REST API query compilation and Blocks rich text conversion.

## Features

- ✅ **Full BaseAdapter implementation** - Complete implementation of all abstract methods
- 🔍 **Query compilation** - Converts universal QueryConfig to Strapi REST API parameters
- 📝 **Rich text conversion** - Bidirectional conversion between Strapi Blocks and Universal RichText
- 🌐 **REST API client** - Built on Axios with full support for Strapi v4/v5 API
- 🔒 **Type-safe** - Full TypeScript support with comprehensive type definitions
- 🎯 **Advanced filtering** - Support for all filter operators (eq, ne, gt, lt, in, contains, etc.)
- 📄 **Pagination** - Page-based pagination with configurable page sizes
- 🔗 **Reference resolution** - Automatic population of relations
- 🌍 **i18n support** - Built-in locale handling for internationalized content

## Installation

```bash
npm install @contentbridge/strapi axios
# or
yarn add @contentbridge/strapi axios
# or
pnpm add @contentbridge/strapi axios
```

> **Note:** `axios` is a peer dependency and must be installed separately.

## Quick Start

```typescript
import { createStrapiAdapter } from '@contentbridge/strapi'

// Create adapter instance
const adapter = createStrapiAdapter({
  baseUrl: 'https://api.example.com',
  apiToken: 'your-api-token',
  apiVersion: 'v4', // or 'v5'
  defaultLocale: 'en',
  includeDrafts: false,
})

// Query documents
const result = await adapter.executeQuery({
  type: 'post',
  filter: [
    { field: 'status', operator: '==', value: 'published' },
    { field: 'featured', operator: '==', value: true },
  ],
  orderBy: [{ field: 'publishedAt', direction: 'desc' }],
  limit: 10,
})

console.log(result.data) // Array of posts
console.log(result.total) // Total count

// Get single document
const post = await adapter.getById('post-123', {
  resolveReferences: true, // Populate relations
})

// Create document
const newPost = await adapter.create('post', {
  title: 'Hello World',
  content: [
    {
      type: 'paragraph',
      children: [{ type: 'text', text: 'This is my first post!' }],
    },
  ],
})

// Update document
const updated = await adapter.update('post-123', {
  title: 'Updated Title',
})

// Delete document
await adapter.delete('post-123')
```

## Configuration

### StrapiAdapterConfig

```typescript
interface StrapiAdapterConfig {
  // Required: Strapi API base URL
  baseUrl: string

  // Optional: API token for authenticated requests
  apiToken?: string

  // Optional: API version (default: 'v4')
  apiVersion?: 'v4' | 'v5'

  // Optional: Include draft/unpublished content (default: false)
  includeDrafts?: boolean

  // Optional: Default locale for i18n content
  defaultLocale?: string

  // Optional: Query compiler configuration
  queryConfig?: QueryCompilerConfig

  // Optional: Custom axios configuration
  axiosConfig?: AxiosRequestConfig

  // Optional: Logger instance
  logger?: Logger

  // Optional: Enable debug logging
  debug?: boolean
}
```

### QueryCompilerConfig

```typescript
interface QueryCompilerConfig {
  // Default locale for localized content
  defaultLocale?: string

  // Fallback locales in order of preference
  fallbackLocales?: string[]

  // Default page size for pagination (default: 25)
  defaultPageSize?: number

  // Maximum page size allowed (default: 100)
  maxPageSize?: number

  // Whether to include draft content (default: false)
  includeDrafts?: boolean
}
```

## Query Compilation

The Strapi adapter compiles universal `QueryConfig` to Strapi's REST API format:

```typescript
import { QueryCompiler } from '@contentbridge/strapi/query'

const compiler = new QueryCompiler({
  defaultLocale: 'en',
  defaultPageSize: 25,
})

const compiled = compiler.compile({
  type: 'post',
  filter: [
    { field: 'title', operator: 'match', value: 'hello' },
    { field: 'publishedAt', operator: '>=', value: '2024-01-01' },
  ],
  orderBy: [{ field: 'publishedAt', direction: 'desc' }],
  limit: 10,
  offset: 0,
})

console.log(compiled.endpoint) // '/api/posts'
console.log(compiled.params.toString())
// filters[title][$containsi]=hello&filters[publishedAt][$gte]=2024-01-01&sort=publishedAt:desc&pagination[page]=1&pagination[pageSize]=10
```

### Filter Operators

Strapi adapter supports all universal filter operators:

| Universal Operator | Strapi Operator | Description |
|--------------------|-----------------|-------------|
| `==` | `$eq` | Equal to |
| `!=` | `$ne` | Not equal to |
| `>` | `$gt` | Greater than |
| `>=` | `$gte` | Greater than or equal |
| `<` | `$lt` | Less than |
| `<=` | `$lte` | Less than or equal |
| `in` | `$in` | Value in array |
| `nin` | `$notIn` | Value not in array |
| `contains` | `$contains` | Array contains value |
| `containsAny` | `$containsi` | Array contains any value |
| `containsAll` | `$and` + `$contains` | Array contains all values |
| `match` | `$containsi` | Case-insensitive search |
| `startsWith` | `$startsWith` | String starts with |
| `endsWith` | `$endsWith` | String ends with |
| `defined` | `$notNull` | Field is not null |
| `undefined` | `$null` | Field is null |

### Logical Operators

```typescript
// AND condition
{
  and: [
    { field: 'status', operator: '==', value: 'published' },
    { field: 'featured', operator: '==', value: true },
  ]
}

// OR condition
{
  or: [
    { field: 'category', operator: '==', value: 'news' },
    { field: 'category', operator: '==', value: 'blog' },
  ]
}

// NOT condition
{
  not: { field: 'archived', operator: '==', value: true }
}
```

## Rich Text Conversion

The Strapi adapter provides bidirectional conversion between Strapi Blocks (v5) and Universal RichText:

```typescript
import { BlocksConverter } from '@contentbridge/strapi/richtext'

const converter = new BlocksConverter()

// Strapi Blocks to Universal
const strapiBlocks = [
  {
    type: 'paragraph',
    children: [
      { type: 'text', text: 'Hello ', bold: false },
      { type: 'text', text: 'World', bold: true },
    ],
  },
]

const universal = converter.fromBlocks(strapiBlocks)
console.log(universal)
// [
//   {
//     _key: 'abc123',
//     _type: 'block',
//     style: 'normal',
//     children: [
//       { _type: 'span', text: 'Hello ', marks: [] },
//       { _type: 'span', text: 'World', marks: ['strong'] },
//     ],
//   },
// ]

// Universal to Strapi Blocks
const universalContent = [
  {
    _key: 'abc123',
    _type: 'block',
    style: 'h1',
    children: [
      { _type: 'span', text: 'My Heading', marks: [] },
    ],
  },
]

const blocks = converter.toBlocks(universalContent)
console.log(blocks)
// [
//   {
//     type: 'heading',
//     level: 1,
//     children: [{ type: 'text', text: 'My Heading' }],
//   },
// ]
```

### Supported Block Types

- **Text blocks**: Paragraph, headings (h1-h6)
- **Lists**: Ordered, unordered
- **Quotes**: Blockquotes with attribution
- **Code**: Code blocks with syntax highlighting
- **Images**: Image blocks with alt text and captions
- **Links**: Inline links with formatting
- **Custom blocks**: Pass-through support for custom block types

### Text Formatting

| Universal Mark | Strapi Property | Description |
|----------------|-----------------|-------------|
| `strong` | `bold: true` | Bold text |
| `em` | `italic: true` | Italic text |
| `code` | `code: true` | Inline code |
| `underline` | `underline: true` | Underlined text |
| `strike` | `strikethrough: true` | Strikethrough text |

## Reference Resolution

Strapi adapter supports automatic population of relations:

```typescript
// Populate all relations (level 1)
const result = await adapter.executeQuery({
  type: 'post',
  resolveReferences: true,
})

// Deep population (multiple levels)
const result = await adapter.executeQuery({
  type: 'post',
  resolveReferences: 2,
})

// Selective population via projection
const result = await adapter.executeQuery({
  type: 'post',
  projection: {
    title: true,
    author: {
      _expand: true,
      projection: {
        name: true,
        avatar: true,
      },
    },
  },
})
```

## Media Handling

```typescript
// Resolve media URL
const url = await adapter.resolveMediaUrl('image-123', {
  width: 800,
  format: 'webp',
})

// Note: Strapi doesn't have built-in image transformation
// For advanced transformations, integrate with Cloudinary, Imgix, etc.
```

## Pagination

```typescript
// Page-based pagination
const page1 = await adapter.executeQuery({
  type: 'post',
  limit: 25,
  offset: 0,
})

const page2 = await adapter.executeQuery({
  type: 'post',
  limit: 25,
  offset: 25,
})

// Check if more pages exist
if (page1.hasMore) {
  console.log('More results available')
}
```

## Internationalization

```typescript
// Query with locale
const posts = await adapter.executeQuery({
  type: 'post',
  locale: 'fr',
  fallbackLocale: 'en',
})

// Set default locale in config
const adapter = createStrapiAdapter({
  baseUrl: 'https://api.example.com',
  defaultLocale: 'en',
})
```

## Error Handling

```typescript
try {
  const result = await adapter.executeQuery({
    type: 'post',
    filter: [{ field: 'status', operator: '==', value: 'published' }],
  })
} catch (error) {
  if (axios.isAxiosError(error)) {
    console.error('Strapi API error:', error.response?.data)
  } else {
    console.error('Unexpected error:', error)
  }
}
```

## Advanced Usage

### Custom Axios Configuration

```typescript
const adapter = createStrapiAdapter({
  baseUrl: 'https://api.example.com',
  apiToken: 'your-token',
  axiosConfig: {
    timeout: 5000,
    headers: {
      'X-Custom-Header': 'value',
    },
  },
})
```

### Access Low-Level Clients

```typescript
// Get Axios instance for custom requests
const httpClient = adapter.getClient()
const response = await httpClient.get('/api/custom-endpoint')

// Get query compiler
const compiler = adapter.getCompiler()
const compiled = compiler.compile(queryConfig)

// Get blocks converter
const converter = adapter.getBlocksConverter()
const universal = converter.fromBlocks(strapiBlocks)
```

### Transactions

```typescript
// Execute multiple operations (sequential, not atomic)
const result = await adapter.transaction([
  {
    type: 'create',
    documentType: 'author',
    data: { name: 'John Doe' },
  },
  {
    type: 'update',
    id: 'post-123',
    data: { author: 'author-456' },
  },
])
```

> **Note:** Strapi doesn't natively support atomic transactions. Operations are executed sequentially.

## Document ID Format

Strapi adapter uses the format `{type}-{id}` for document IDs:

```typescript
// Create returns: "post-123"
const post = await adapter.create('post', { title: 'Hello' })
console.log(post._id) // "post-123"

// Get by ID requires type prefix
const retrieved = await adapter.getById('post-123')
```

## API Compatibility

- **Strapi v4**: Full support
- **Strapi v5**: Full support (including Blocks editor)
- **Strapi v3**: Not supported (different API structure)

## Limitations

1. **Image transformations**: Strapi doesn't provide built-in image transformation. Use external services like Cloudinary or Imgix.
2. **Transactions**: Not atomic - operations execute sequentially without rollback guarantee.
3. **Cursor pagination**: Not natively supported - uses page-based pagination.
4. **Multi-type queries**: Strapi REST API doesn't support querying multiple content types in one request.

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type { StrapiAdapterConfig } from '@contentbridge/strapi'
import type { BaseDocument } from '@contentbridge/core/types'

interface Post extends BaseDocument {
  title: string
  content: unknown[]
  publishedAt: string
}

const posts = await adapter.executeQuery<Post>({
  type: 'post',
  filter: [{ field: 'title', operator: 'match', value: 'hello' }],
})

// posts.data is typed as Post[]
```

## Contributing

Contributions are welcome! Please see the main ContentBridge repository for guidelines.

## License

MIT

## Resources

- [Strapi Documentation](https://docs.strapi.io/)
- [Strapi REST API](https://docs.strapi.io/dev-docs/api/rest)
- [Strapi Blocks Editor](https://docs.strapi.io/dev-docs/plugins/blocks)
- [ContentBridge Documentation](https://github.com/your-org/contentbridge)
