# Creating Custom Adapters

This guide walks you through creating a custom adapter for ContentBridge, allowing you to add support for any headless CMS.

## Overview

All adapters extend the `BaseAdapter` abstract class from `@contentbridge/core`. Your adapter must implement:

- **Query Methods**: Compile queries and fetch data
- **Mutation Methods**: Create, update, patch, and delete documents
- **Rich Text Methods**: Convert between universal and CMS-specific formats
- **Media Methods**: Resolve asset URLs and generate responsive images
- **Type Generation**: Generate TypeScript types from schemas

## Quick Start

```bash
# Create a new package
mkdir packages/my-cms
cd packages/my-cms

# Initialize package.json
pnpm init

# Add dependencies
pnpm add @contentbridge/core
pnpm add -D typescript vitest
```

## Project Structure

```
packages/my-cms/
├── src/
│   ├── index.ts              # Public exports
│   ├── MyCmsAdapter.ts       # Main adapter class
│   ├── query/
│   │   └── QueryCompiler.ts  # Universal → CMS query format
│   ├── richtext/
│   │   └── RichTextConverter.ts
│   └── media/
│       └── MediaResolver.ts
├── __tests__/
│   ├── adapter.test.ts
│   ├── query.test.ts
│   └── richtext.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Step 1: Adapter Configuration

Define your adapter's configuration interface:

```typescript
// src/MyCmsAdapter.ts
import { BaseAdapter, AdapterConfig } from '@contentbridge/core'

export interface MyCmsConfig extends AdapterConfig {
  /** API endpoint URL */
  endpoint: string

  /** API key for authentication */
  apiKey: string

  /** Space or project ID */
  spaceId: string

  /** Environment (e.g., 'master', 'preview') */
  environment?: string
}
```

## Step 2: Implement the Adapter Class

```typescript
import {
  BaseAdapter,
  QueryConfig,
  QueryResult,
  SingleResult,
  BaseDocument,
  TransactionOperation,
  TransactionResult,
  UniversalRichText,
  ResponsiveImageOptions,
  ResponsiveImageSet,
  PlaceholderOptions,
  DocumentSchema,
  GeneratedTypes,
  TypeGenerationOptions,
} from '@contentbridge/core'
import { MyCmsQueryCompiler } from './query/QueryCompiler'
import { MyCmsRichTextConverter } from './richtext/RichTextConverter'

export class MyCmsAdapter extends BaseAdapter<MyCmsConfig> {
  readonly name = 'my-cms'
  readonly version = '1.0.0'

  private client: MyCmsClient
  private queryCompiler: MyCmsQueryCompiler
  private richTextConverter: MyCmsRichTextConverter

  constructor(config: MyCmsConfig) {
    super(config)
    this.client = new MyCmsClient(config)
    this.queryCompiler = new MyCmsQueryCompiler()
    this.richTextConverter = new MyCmsRichTextConverter()
  }

  async initialize(): Promise<void> {
    await super.initialize()
    await this.client.connect()
    this.logger.info('Connected to MyCMS')
  }

  async cleanup(): Promise<void> {
    await this.client.disconnect()
    await super.cleanup()
  }

  // ... implement abstract methods
}
```

## Step 3: Implement Query Methods

### compileQuery

Convert a universal `QueryConfig` to your CMS's native query format:

```typescript
async compileQuery<T>(config: QueryConfig<T>): Promise<string | object> {
  return this.queryCompiler.compile(config)
}
```

### QueryCompiler Pattern

```typescript
// src/query/QueryCompiler.ts
import { QueryConfig, FilterCondition } from '@contentbridge/core'

export class MyCmsQueryCompiler {
  compile<T>(config: QueryConfig<T>): object {
    const query: Record<string, unknown> = {
      content_type: config.type,
    }

    // Compile filters
    if (config.filter?.length) {
      query.filters = this.compileFilters(config.filter)
    }

    // Compile ordering
    if (config.orderBy?.length) {
      query.order = config.orderBy.map(o =>
        `${o.direction === 'desc' ? '-' : ''}${o.field}`
      ).join(',')
    }

    // Pagination
    if (config.limit) query.limit = config.limit
    if (config.offset) query.skip = config.offset

    // Projections
    if (config.projection?.length) {
      query.select = config.projection.join(',')
    }

    return query
  }

  private compileFilters(filters: FilterCondition[]): object {
    const compiled: Record<string, unknown> = {}

    for (const filter of filters) {
      switch (filter.operator) {
        case '==':
          compiled[filter.field] = filter.value
          break
        case '!=':
          compiled[`${filter.field}[ne]`] = filter.value
          break
        case '>':
          compiled[`${filter.field}[gt]`] = filter.value
          break
        case '>=':
          compiled[`${filter.field}[gte]`] = filter.value
          break
        case '<':
          compiled[`${filter.field}[lt]`] = filter.value
          break
        case '<=':
          compiled[`${filter.field}[lte]`] = filter.value
          break
        case 'in':
          compiled[`${filter.field}[in]`] = filter.value
          break
        case 'contains':
          compiled[`${filter.field}[contains]`] = filter.value
          break
        case 'match':
          compiled[`${filter.field}[match]`] = filter.value
          break
        // Add more operators as needed
      }
    }

    return compiled
  }
}
```

### executeQuery

Execute the compiled query and return results:

```typescript
async executeQuery<T extends BaseDocument>(
  config: QueryConfig<T>
): Promise<QueryResult<T>> {
  const query = await this.compileQuery(config)

  const response = await this.client.query(query)

  return {
    data: response.items.map(item => this.transformDocument<T>(item)),
    total: response.total,
    hasMore: response.skip + response.items.length < response.total,
    cursor: response.nextCursor,
  }
}

private transformDocument<T extends BaseDocument>(raw: unknown): T {
  // Transform CMS response to ContentBridge document format
  const item = raw as Record<string, unknown>
  return {
    _id: item.sys.id,
    _type: item.sys.contentType.sys.id,
    _createdAt: item.sys.createdAt,
    _updatedAt: item.sys.updatedAt,
    ...item.fields,
  } as T
}
```

### getById

```typescript
async getById<T extends BaseDocument>(
  id: string,
  options?: { resolveReferences?: boolean | number; includeDrafts?: boolean }
): Promise<SingleResult<T>> {
  try {
    const response = await this.client.getEntry(id, {
      include: options?.resolveReferences ? 10 : 0,
      preview: options?.includeDrafts,
    })

    return {
      data: this.transformDocument<T>(response),
      _raw: response,
    }
  } catch (error) {
    if (error.status === 404) {
      return { data: null }
    }
    throw error
  }
}
```

### count

```typescript
async count(config: QueryConfig): Promise<number> {
  const query = await this.compileQuery({ ...config, limit: 0 })
  const response = await this.client.query(query)
  return response.total
}
```

## Step 4: Implement Mutation Methods

### create

```typescript
async create<T extends BaseDocument>(
  documentType: string,
  data: Omit<T, '_id' | '_type' | '_createdAt' | '_updatedAt' | '_rev'>
): Promise<T> {
  const response = await this.client.createEntry(documentType, {
    fields: this.transformFieldsForCms(data),
  })

  // Publish immediately or return draft based on config
  if (this.config.autoPublish) {
    await this.client.publishEntry(response.sys.id)
  }

  return this.transformDocument<T>(response)
}
```

### update

```typescript
async update<T extends BaseDocument>(
  id: string,
  data: Partial<Omit<T, '_id' | '_type' | '_createdAt' | '_updatedAt' | '_rev'>>
): Promise<T> {
  // Get current version for optimistic locking
  const current = await this.client.getEntry(id)

  const response = await this.client.updateEntry(id, {
    fields: {
      ...current.fields,
      ...this.transformFieldsForCms(data),
    },
  }, current.sys.version)

  return this.transformDocument<T>(response)
}
```

### patch

```typescript
async patch<T extends BaseDocument>(
  id: string,
  patches: Array<{ op: 'set' | 'unset' | 'insert' | 'replace'; path: string; value?: unknown }>
): Promise<T> {
  const current = await this.client.getEntry(id)
  const fields = { ...current.fields }

  for (const patch of patches) {
    switch (patch.op) {
      case 'set':
        this.setNestedValue(fields, patch.path, patch.value)
        break
      case 'unset':
        this.deleteNestedValue(fields, patch.path)
        break
      case 'insert':
        // Handle array insert
        break
      case 'replace':
        // Handle array item replacement
        break
    }
  }

  const response = await this.client.updateEntry(id, { fields }, current.sys.version)
  return this.transformDocument<T>(response)
}
```

### delete

```typescript
async delete<T extends BaseDocument>(id: string): Promise<T> {
  const current = await this.client.getEntry(id)
  await this.client.unpublishEntry(id)
  await this.client.deleteEntry(id)
  return this.transformDocument<T>(current)
}
```

### transaction

```typescript
async transaction(operations: TransactionOperation[]): Promise<TransactionResult> {
  const results: TransactionResult['results'] = []

  // Most CMSs don't support true transactions, so we execute sequentially
  // and rollback on failure if possible
  try {
    for (const op of operations) {
      switch (op.type) {
        case 'create':
          const created = await this.create(op.documentType!, op.data)
          results.push({ success: true, document: created })
          break
        case 'update':
          const updated = await this.update(op.id!, op.data)
          results.push({ success: true, document: updated })
          break
        case 'delete':
          const deleted = await this.delete(op.id!)
          results.push({ success: true, document: deleted })
          break
      }
    }

    return { success: true, results }
  } catch (error) {
    return {
      success: false,
      results,
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}
```

## Step 5: Implement Rich Text Conversion

Convert between your CMS's rich text format and ContentBridge's universal format:

```typescript
// src/richtext/RichTextConverter.ts
import { UniversalBlock, UniversalSpan } from '@contentbridge/core'

export class MyCmsRichTextConverter {
  toUniversal(nativeContent: MyCmsRichText): UniversalBlock[] {
    return nativeContent.content.map(node => this.convertNode(node))
  }

  fromUniversal(blocks: UniversalBlock[]): MyCmsRichText {
    return {
      nodeType: 'document',
      content: blocks.map(block => this.convertFromUniversal(block)),
    }
  }

  private convertNode(node: MyCmsNode): UniversalBlock {
    switch (node.nodeType) {
      case 'paragraph':
        return {
          _type: 'block',
          style: 'normal',
          children: this.convertInlineNodes(node.content),
        }
      case 'heading-1':
        return {
          _type: 'block',
          style: 'h1',
          children: this.convertInlineNodes(node.content),
        }
      // Handle other node types...
      default:
        return {
          _type: 'block',
          style: 'normal',
          children: [{ _type: 'span', text: '' }],
        }
    }
  }

  private convertInlineNodes(nodes: MyCmsInlineNode[]): UniversalSpan[] {
    return nodes.map(node => {
      if (node.nodeType === 'text') {
        return {
          _type: 'span',
          text: node.value,
          marks: this.convertMarks(node.marks),
        }
      }
      // Handle links, references, etc.
      return { _type: 'span', text: '' }
    })
  }
}
```

In your adapter:

```typescript
async toUniversalRichText(nativeContent: unknown): Promise<UniversalRichText> {
  return {
    _type: 'richtext',
    content: this.richTextConverter.toUniversal(nativeContent as MyCmsRichText),
  }
}

async fromUniversalRichText(universalContent: UniversalRichText): Promise<unknown> {
  return this.richTextConverter.fromUniversal(universalContent.content)
}
```

## Step 6: Implement Media Methods

```typescript
async resolveMediaUrl(
  assetRef: string | DocumentReference | MediaAsset,
  options?: { width?: number; height?: number; format?: string; quality?: number }
): Promise<string> {
  const assetId = typeof assetRef === 'string' ? assetRef : assetRef._ref ?? assetRef._id
  const asset = await this.client.getAsset(assetId)

  let url = asset.fields.file.url

  // Add query parameters for transformations
  const params = new URLSearchParams()
  if (options?.width) params.set('w', String(options.width))
  if (options?.height) params.set('h', String(options.height))
  if (options?.format) params.set('fm', options.format)
  if (options?.quality) params.set('q', String(options.quality))

  const queryString = params.toString()
  return queryString ? `${url}?${queryString}` : url
}

async getResponsiveImage(
  assetRef: string | DocumentReference | MediaAsset,
  options: ResponsiveImageOptions
): Promise<ResponsiveImageSet> {
  const baseUrl = await this.resolveMediaUrl(assetRef)

  const srcset = options.widths
    .map(w => `${baseUrl}?w=${w} ${w}w`)
    .join(', ')

  return {
    src: `${baseUrl}?w=${options.widths[options.widths.length - 1]}`,
    srcset,
    sources: (options.formats ?? ['webp', 'jpg']).map(format => ({
      srcset: options.widths.map(w => `${baseUrl}?w=${w}&fm=${format} ${w}w`).join(', '),
      type: `image/${format}`,
    })),
    width: options.widths[options.widths.length - 1],
    height: 0, // Calculate from aspect ratio if available
    aspectRatio: 0,
  }
}

async getPlaceholder(
  assetRef: string | DocumentReference | MediaAsset,
  options: PlaceholderOptions
): Promise<string> {
  const url = await this.resolveMediaUrl(assetRef, {
    width: options.width ?? 20,
    quality: options.quality ?? 10,
  })

  // For LQIP, fetch and convert to base64
  if (options.type === 'lqip') {
    const response = await fetch(url)
    const buffer = await response.arrayBuffer()
    return `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`
  }

  return url
}
```

## Step 7: Implement Type Generation

```typescript
async generateTypes(
  schemas: DocumentSchema[],
  options?: TypeGenerationOptions
): Promise<GeneratedTypes> {
  const interfaces: string[] = []
  const exports: string[] = []

  for (const schema of schemas) {
    const typeName = this.pascalCase(schema.name)
    const fields = schema.fields.map(f =>
      `  ${f.name}${f.required ? '' : '?'}: ${this.mapFieldType(f.type)}`
    ).join('\n')

    interfaces.push(`export interface ${typeName} extends BaseDocument {
  _type: '${schema.name}'
${fields}
}`)
    exports.push(typeName)
  }

  return {
    interfaces: interfaces.join('\n\n'),
    exports: `export type { ${exports.join(', ')} }`,
    imports: ["import type { BaseDocument } from '@contentbridge/core'"],
  }
}

async generateZodSchemas(
  schemas: DocumentSchema[],
  options?: TypeGenerationOptions
): Promise<string> {
  // Generate Zod schemas for runtime validation
  // Similar pattern to generateTypes
}
```

## Step 8: Testing Your Adapter

### Unit Tests

```typescript
// __tests__/query.test.ts
import { describe, it, expect } from 'vitest'
import { MyCmsQueryCompiler } from '../src/query/QueryCompiler'

describe('MyCmsQueryCompiler', () => {
  const compiler = new MyCmsQueryCompiler()

  it('compiles basic query', () => {
    const result = compiler.compile({
      type: 'post',
      filter: [{ field: 'status', operator: '==', value: 'published' }],
      limit: 10,
    })

    expect(result).toEqual({
      content_type: 'post',
      filters: { status: 'published' },
      limit: 10,
    })
  })

  it('compiles comparison operators', () => {
    const result = compiler.compile({
      type: 'post',
      filter: [{ field: 'views', operator: '>', value: 100 }],
    })

    expect(result.filters).toEqual({ 'views[gt]': 100 })
  })
})
```

### Integration Tests

```typescript
// __tests__/adapter.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { MyCmsAdapter } from '../src'

describe('MyCmsAdapter', () => {
  let adapter: MyCmsAdapter

  beforeAll(async () => {
    adapter = new MyCmsAdapter({
      endpoint: process.env.MY_CMS_ENDPOINT!,
      apiKey: process.env.MY_CMS_API_KEY!,
      spaceId: process.env.MY_CMS_SPACE_ID!,
    })
    await adapter.initialize()
  })

  afterAll(async () => {
    await adapter.cleanup()
  })

  it('executes queries', async () => {
    const result = await adapter.executeQuery({
      type: 'post',
      limit: 5,
    })

    expect(result.data).toHaveLength(5)
    expect(result.data[0]).toHaveProperty('_id')
  })

  it('creates and deletes documents', async () => {
    const created = await adapter.create('post', {
      title: 'Test Post',
      slug: { current: 'test-post' },
    })

    expect(created._id).toBeDefined()
    expect(created.title).toBe('Test Post')

    await adapter.delete(created._id)
  })
})
```

## Step 9: Export Public API

```typescript
// src/index.ts
export { MyCmsAdapter } from './MyCmsAdapter'
export type { MyCmsConfig } from './MyCmsAdapter'

// Factory function (recommended)
export function createMyCmsAdapter(config: MyCmsConfig): MyCmsAdapter {
  return new MyCmsAdapter(config)
}
```

## Checklist

Before publishing your adapter:

- [ ] All abstract methods implemented
- [ ] Query compilation handles all filter operators
- [ ] Rich text conversion supports common block types
- [ ] Media URLs include transformation parameters
- [ ] Error handling with meaningful messages
- [ ] Unit tests for query compilation
- [ ] Unit tests for rich text conversion
- [ ] Integration tests against real API
- [ ] TypeScript types exported
- [ ] JSDoc documentation on public methods
- [ ] README with usage examples
- [ ] CHANGELOG for version history

## Publishing

1. Update `package.json` with correct metadata
2. Build: `pnpm build`
3. Test: `pnpm test`
4. Publish: `pnpm publish --access public`

## Example Adapters

Study the existing adapters for reference:

- [`@contentbridge/sanity`](../../../packages/sanity) - GROQ queries, Portable Text
- [`@contentbridge/contentful`](../../../packages/contentful) - GraphQL/REST, Contentful Rich Text
- [`@contentbridge/payload`](../../../packages/payload) - Local API, Slate editor
- [`@contentbridge/strapi`](../../../packages/strapi) - REST API, v4/v5 support

## Getting Help

- [GitHub Discussions](https://github.com/ncklrs/contentbridge/discussions)
- [Discord Community](#) (coming soon)
- [API Reference](../api-reference.md)
