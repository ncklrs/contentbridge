# @contentbridge/contentful

Contentful CMS adapter for ContentBridge - provides seamless integration with Contentful's Content Delivery API (CDA) and Content Management API (CMA).

## Features

- ✅ **Complete BaseAdapter Implementation** - All abstract methods implemented
- ✅ **Query Compilation** - Universal QueryConfig → Contentful API parameters
- ✅ **Rich Text Conversion** - Bidirectional conversion between Contentful Rich Text and UniversalBlock[]
- ✅ **Asset Resolution** - Image URL generation with transformation parameters
- ✅ **Localization Support** - Multi-locale content management
- ✅ **Read & Write Operations** - Full CRUD support via CDA and CMA
- ✅ **Reference Resolution** - Automatic linked entry/asset resolution

## Installation

```bash
npm install @contentbridge/contentful contentful contentful-management
# or
yarn add @contentbridge/contentful contentful contentful-management
# or
pnpm add @contentbridge/contentful contentful contentful-management
```

## Quick Start

### Read-Only Usage (Content Delivery API)

```typescript
import { createClient } from 'contentful'
import { createContentfulAdapter } from '@contentbridge/contentful'

// Create Contentful delivery client
const deliveryClient = createClient({
  space: 'your-space-id',
  accessToken: 'your-delivery-token',
  environment: 'master', // optional
})

// Create adapter
const adapter = createContentfulAdapter({
  spaceId: 'your-space-id',
  accessToken: 'your-delivery-token',
  deliveryClient,
  defaultLocale: 'en-US',
})

// Initialize
await adapter.initialize()

// Query content
const result = await adapter.executeQuery({
  type: 'blogPost',
  filter: [
    { field: 'featured', operator: '==', value: true },
    { field: 'publishDate', operator: '<=', value: new Date().toISOString() },
  ],
  orderBy: [{ field: 'publishDate', direction: 'desc' }],
  limit: 10,
})

console.log(result.data) // Array of blog posts
console.log(result.total) // Total matching count
```

### Read & Write Usage (Content Management API)

```typescript
import { createClient } from 'contentful'
import { createClient as createManagementClient } from 'contentful-management'
import { createContentfulAdapter } from '@contentbridge/contentful'

// Create both clients
const deliveryClient = createClient({
  space: 'your-space-id',
  accessToken: 'your-delivery-token',
})

const managementClient = createManagementClient({
  accessToken: 'your-management-token',
})

// Create adapter with both clients
const adapter = createContentfulAdapter({
  spaceId: 'your-space-id',
  accessToken: 'your-delivery-token',
  managementToken: 'your-management-token',
  deliveryClient,
  managementClient,
  defaultLocale: 'en-US',
})

await adapter.initialize()

// Create a new entry
const newPost = await adapter.create('blogPost', {
  title: 'Hello Contentful',
  slug: 'hello-contentful',
  body: {
    nodeType: 'document',
    content: [
      {
        nodeType: 'paragraph',
        content: [
          { nodeType: 'text', value: 'This is my first post!' },
        ],
      },
    ],
  },
})

// Update an entry
const updated = await adapter.update(newPost._id, {
  title: 'Updated Title',
})

// Delete an entry
await adapter.delete(newPost._id)
```

## Query Compilation

The adapter compiles universal QueryConfig to Contentful API parameters:

```typescript
// Universal query
const queryConfig = {
  type: 'blogPost',
  filter: [
    { field: 'category', operator: '==', value: 'technology' },
    { field: 'views', operator: '>', value: 1000 },
  ],
  orderBy: [{ field: 'publishDate', direction: 'desc' }],
  limit: 20,
  offset: 0,
  locale: 'en-US',
}

// Compiles to Contentful parameters
const contentfulQuery = await adapter.compileQuery(queryConfig)
// {
//   content_type: 'blogPost',
//   'fields.category': 'technology',
//   'fields.views[gt]': 1000,
//   order: '-fields.publishDate',
//   limit: 20,
//   skip: 0,
//   locale: 'en-US'
// }
```

### Supported Operators

| Universal Operator | Contentful Operator | Example |
|--------------------|---------------------|---------|
| `==` | (none) | `fields.status: 'published'` |
| `!=` | `[ne]` | `fields.status[ne]: 'draft'` |
| `>` | `[gt]` | `fields.price[gt]: 100` |
| `>=` | `[gte]` | `fields.rating[gte]: 4.5` |
| `<` | `[lt]` | `fields.stock[lt]: 10` |
| `<=` | `[lte]` | `fields.age[lte]: 18` |
| `in` | `[in]` | `fields.category[in]: 'tech,science'` |
| `nin` | `[nin]` | `fields.status[nin]: 'draft,archived'` |
| `contains` | `[all]` | `fields.tags[all]: 'javascript'` |
| `match` | `[match]` | `fields.title[match]: 'contentful'` |
| `defined` | `[exists]` | `fields.image[exists]: true` |

## Rich Text Conversion

Convert between Contentful Rich Text and universal format:

```typescript
import { fromContentfulRichText, toContentfulRichText } from '@contentbridge/contentful'

// Contentful Rich Text → Universal
const contentfulRichText = {
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

const universal = fromContentfulRichText(contentfulRichText)
// [
//   {
//     _key: 'abc123',
//     _type: 'block',
//     style: 'normal',
//     children: [
//       { _type: 'span', text: 'Hello ', marks: [] },
//       { _type: 'span', text: 'World', marks: ['strong'] }
//     ]
//   }
// ]

// Universal → Contentful Rich Text
const backToContentful = toContentfulRichText(universal)
```

### Rich Text Node Types

**Block Nodes:**
- `document` - Root container
- `paragraph` - Regular paragraph
- `heading-1` through `heading-6` - Headings
- `blockquote` - Quote block
- `unordered-list` / `ordered-list` - Lists
- `hr` - Horizontal rule
- `embedded-asset-block` - Embedded image/file
- `embedded-entry-block` - Embedded entry

**Inline Nodes:**
- `hyperlink` - External link
- `entry-hyperlink` - Link to entry
- `asset-hyperlink` - Link to asset

**Marks:**
- `bold` → `strong`
- `italic` → `em`
- `underline` → `underline`
- `code` → `code`
- `subscript` → `sub`
- `superscript` → `sup`

## Asset Management

### Resolve Asset URLs

```typescript
// Simple URL resolution
const url = await adapter.resolveMediaUrl('asset-id')

// With transformations
const transformedUrl = await adapter.resolveMediaUrl('asset-id', {
  width: 800,
  height: 600,
  format: 'webp',
  quality: 80,
  fit: 'fill',
})
// Returns: https://images.ctfassets.net/.../image.jpg?w=800&h=600&fm=webp&q=80&fit=fill
```

### Responsive Images

```typescript
const imageSet = await adapter.getResponsiveImage('asset-id', {
  widths: [400, 800, 1200, 1600],
  formats: ['webp', 'jpg'],
  quality: 85,
})

console.log(imageSet)
// {
//   src: 'https://...?w=400&fm=webp&q=85',
//   srcset: 'https://...?w=400&... 400w, https://...?w=800&... 800w, ...',
//   sources: [
//     { srcset: '...', type: 'image/webp' },
//     { srcset: '...', type: 'image/jpg' }
//   ],
//   width: 1920,
//   height: 1080,
//   aspectRatio: 1.777...
// }
```

### Image Placeholders

```typescript
// Low-quality placeholder
const lqip = await adapter.getPlaceholder('asset-id', {
  type: 'lqip',
  width: 20,
  quality: 10,
})
// Returns low-quality URL for progressive loading
```

## Advanced Usage

### Reference Resolution

```typescript
// Resolve references up to 2 levels deep
const post = await adapter.getById('post-id', {
  resolveReferences: 2,
})

// post.author is now fully resolved (not just a reference)
console.log(post.author.name)
console.log(post.author.avatar.url)
```

### Localization

```typescript
// Query specific locale
const result = await adapter.executeQuery({
  type: 'blogPost',
  locale: 'fr-FR',
  fallbackLocale: 'en-US',
})

// Create localized content
const adapter = createContentfulAdapter({
  // ...
  defaultLocale: 'de-DE',
  compilerConfig: {
    defaultLocale: 'de-DE',
  },
})
```

### Batch Operations

```typescript
// Get multiple entries by ID
const entries = await adapter.executeQuery({
  type: 'blogPost',
  filter: [
    {
      field: '_id',
      operator: 'in',
      value: ['id1', 'id2', 'id3'],
    },
  ],
})

// Or use count for total matching
const total = await adapter.count({
  type: 'blogPost',
  filter: [{ field: 'status', operator: '==', value: 'published' }],
})
```

## Configuration

### ContentfulAdapterConfig

```typescript
interface ContentfulAdapterConfig {
  // Required
  spaceId: string

  // Optional
  environment?: string              // Default: 'master'
  accessToken?: string              // For delivery API
  previewToken?: string             // For preview API
  managementToken?: string          // For write operations
  usePreview?: boolean              // Use preview API (default: false)
  defaultLocale?: string            // Default: 'en-US'

  // Clients (can provide externally)
  deliveryClient?: ContentfulClientApi
  managementClient?: PlainClientAPI

  // Query compiler config
  compilerConfig?: {
    defaultLocale?: string
    includeAllLocales?: boolean     // Query all locales (default: false)
    defaultLimit?: number           // Default: 100
    resolveDepth?: number           // Max depth for references (default: 10)
  }

  // Logging
  debug?: boolean
  logger?: Logger
}
```

## Limitations

### Contentful API Constraints

1. **Multiple Content Types** - Contentful doesn't support querying multiple content types in one request. The adapter uses the first type if multiple are provided.

2. **Complex OR Conditions** - OR conditions across different fields require multiple queries. The adapter executes the first condition.

3. **Transactions** - Contentful doesn't support atomic transactions. The adapter executes operations sequentially and attempts rollback on failure.

4. **Partial Field Selection** - Contentful's `select` parameter doesn't support partial nested object selection. The adapter includes entire nested objects.

## API Reference

See the [BaseAdapter documentation](../core/README.md) for the complete API surface that this adapter implements.

## Examples

Check the `/examples/contentful` directory for complete working examples:

- Basic querying
- Content creation and updates
- Rich text handling
- Image transformations
- Localization
- Reference resolution

## Contributing

See the main [ContentBridge repository](../../README.md) for contribution guidelines.

## License

MIT
