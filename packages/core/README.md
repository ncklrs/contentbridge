# @contentbridge/core

Core types, interfaces, and utilities for ContentBridge - a universal content abstraction layer for headless CMS platforms.

## Overview

`@contentbridge/core` provides the foundational types and interfaces that enable CMS-agnostic content operations. It defines the contracts that all adapters must implement, ensuring a consistent API across different headless CMS platforms.

## Installation

```bash
pnpm add @contentbridge/core
```

This package is typically installed automatically as a dependency when you install a specific adapter (e.g., `@contentbridge/sanity`, `@contentbridge/contentful`).

## What's Included

### Types

- **Document Types** - `BaseDocument`, `DocumentReference`, `Slug`, `DocumentSchema`
- **Query Types** - `QueryConfig`, `FilterCondition`, `Projection`, `QueryResult`
- **Rich Text Types** - `UniversalBlock`, `RichTextContent`, `TextNode`, `ElementNode`
- **Media Types** - `MediaAsset`, `ImageTransform`, `ResponsiveImage`

### Interfaces

- **ContentService** - Main service interface that all adapters implement
- **BaseAdapter** - Abstract base class for creating new adapters
- **QueryBuilder** - Fluent API for building type-safe queries
- **MutationBuilder** - Fluent API for building transactions

### Utilities

- **Logger** - Configurable logging utility
- **Errors** - Custom error classes for better error handling

## Usage

### Importing Types

```typescript
import type {
  BaseDocument,
  DocumentReference,
  QueryConfig,
  FilterCondition,
  UniversalBlock,
} from '@contentbridge/core'

// Define your document types
interface Post extends BaseDocument {
  _type: 'post'
  title: string
  slug: { current: string }
  author: DocumentReference
  content: UniversalBlock[]
}
```

### Using with Adapters

```typescript
import type { ContentService } from '@contentbridge/core'
import { createSanityAdapter } from '@contentbridge/sanity'

// Adapter implements ContentService interface
const adapter: ContentService = createSanityAdapter(/* config */)

// Type-safe queries
const posts = await adapter
  .query<Post>('post')
  .where('status', '==', 'published')
  .getMany()
```

### Creating Custom Adapters

Extend `BaseAdapter` to create adapters for new CMS platforms:

```typescript
import { BaseAdapter } from '@contentbridge/core'
import type {
  QueryConfig,
  QueryResult,
  TransactionOperation,
  TransactionResult,
} from '@contentbridge/core'

class MyCMSAdapter extends BaseAdapter {
  readonly name = 'my-cms'
  readonly version = '1.0.0'

  async compileQuery<T>(config: QueryConfig<T>): Promise<string> {
    // Convert QueryConfig to your CMS's native query format
    return `query for ${config.type}`
  }

  async executeQuery<T>(config: QueryConfig<T>): Promise<QueryResult<T>> {
    // Execute query using your CMS's client
    const data = await this.client.fetch(/* ... */)
    return { data, total: data.length }
  }

  // Implement other required methods...
}
```

## Exported Modules

### Main Entry Point

```typescript
import {
  // Types
  BaseDocument,
  DocumentReference,
  Slug,
  QueryConfig,
  FilterCondition,
  UniversalBlock,

  // Interfaces
  ContentService,
  BaseAdapter,

  // Utilities
  createLogger,
  ContentBridgeError,
} from '@contentbridge/core'
```

### Service Layer

```typescript
import {
  ContentService,
  QueryBuilder,
  MutationBuilder,
  GetOptions,
  MutationOptions,
  PatchOperation,
  TransactionOperation,
  TransactionResult,
} from '@contentbridge/core/service'
```

### Type Definitions

```typescript
import {
  BaseDocument,
  DocumentReference,
  DocumentSchema,
  Slug,
} from '@contentbridge/core/types'
```

### Adapters

```typescript
import {
  BaseAdapter,
  AdapterConfig,
  UniversalRichText,
  ResponsiveImageOptions,
  ResponsiveImageSet,
  PlaceholderOptions,
  TypeGenerationOptions,
  GeneratedTypes,
} from '@contentbridge/core/adapters'
```

### Rich Text

```typescript
import {
  UniversalBlock,
  RichTextContent,
  TextNode,
  ElementNode,
  CustomBlock,
} from '@contentbridge/core/richtext'
```

### Media

```typescript
import {
  MediaAsset,
  ImageTransform,
  ResponsiveImage,
  PlaceholderType,
} from '@contentbridge/core/media'
```

### Utils

```typescript
import {
  createLogger,
  createChildLogger,
  ContentBridgeError,
  ValidationError,
  NotFoundError,
} from '@contentbridge/core/utils'
```

## Key Concepts

### Universal Types

ContentBridge uses universal types that work across all CMS platforms:

```typescript
// Works with Sanity, Contentful, Payload, Strapi, etc.
interface Post extends BaseDocument {
  _id: string  // Universal ID field
  _type: string  // Universal type field
  title: string
  slug: Slug  // Universal slug type
  author: DocumentReference  // Universal reference type
}
```

### Query Configuration

`QueryConfig` is the universal query format that adapters compile to native queries:

```typescript
const config: QueryConfig<Post> = {
  type: 'post',
  filter: [
    { field: 'status', operator: '==', value: 'published' },
    { field: 'publishedAt', operator: '>', value: '2024-01-01' },
  ],
  orderBy: [{ field: 'publishedAt', direction: 'desc' }],
  limit: 10,
}

// Sanity: compiles to GROQ
// Contentful: compiles to REST API params
// Payload: compiles to MongoDB query
// Strapi: compiles to Strapi filters
```

### Rich Text Conversion

`UniversalBlock` represents rich text in a format-agnostic way:

```typescript
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

// Can be converted to:
// - Sanity Portable Text
// - Contentful Rich Text
// - Payload Slate
// - Strapi Blocks
```

## Type Safety

All types are fully type-safe with TypeScript:

```typescript
import type { BaseDocument } from '@contentbridge/core'

interface Post extends BaseDocument {
  title: string
  views: number
}

// TypeScript knows about your document structure
const query = adapter.query<Post>('post')
  .where('title', '==', 'Hello')  // ✓ Type-safe field names
  .where('views', '>', 100)  // ✓ Type-safe operators
  .where('invalid', '==', 'x')  // ✗ TypeScript error

// Return types are inferred
const result = await query.getMany()
result.data.forEach(post => {
  console.log(post.title)  // ✓ TypeScript knows this is a string
  console.log(post.views)  // ✓ TypeScript knows this is a number
})
```

## Error Handling

ContentBridge provides custom error classes:

```typescript
import {
  ContentBridgeError,
  ValidationError,
  NotFoundError,
} from '@contentbridge/core'

try {
  const post = await adapter.getById('invalid-id')
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Post not found')
  } else if (error instanceof ValidationError) {
    console.log('Validation failed:', error.details)
  } else if (error instanceof ContentBridgeError) {
    console.log('ContentBridge error:', error.message)
  }
}
```

## Logging

Built-in logging with configurable levels:

```typescript
import { createLogger } from '@contentbridge/core'

const logger = createLogger('my-adapter')
  .withLevel('debug')

logger.debug('Debug message')
logger.info('Info message')
logger.warn('Warning message')
logger.error('Error message')
```

## Documentation

- [Getting Started Guide](../../docs/getting-started.md)
- [API Reference](../../docs/api-reference.md)
- [Adapter Guides](../../docs/adapters/)

## License

MIT

---

Part of the [ContentBridge](https://github.com/contentbridge/contentbridge) monorepo.
