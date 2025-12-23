# BaseAdapter and Utilities Implementation

## Overview

This implementation provides the foundational abstract adapter class and utility modules for the ContentBridge core package. All CMS adapters (Sanity, Contentful, Payload, etc.) will extend the `BaseAdapter` class.

## Files Created

### 1. BaseAdapter (`src/adapters/BaseAdapter.ts`)

Abstract base class that defines the contract for all CMS adapters. Key features:

**Core Properties:**
- `name`: Adapter identifier (e.g., 'sanity', 'contentful')
- `version`: Adapter version
- `config`: Adapter-specific configuration
- `logger`: Logger instance for debugging

**Query Methods:**
- `compileQuery()` - Convert universal QueryConfig to CMS-native format
- `executeQuery()` - Execute query and return results
- `count()` - Get total count of matching documents
- `getById()` - Fetch single document by ID

**Mutation Methods:**
- `create()` - Create new document
- `update()` - Full document replacement
- `patch()` - Partial document update
- `delete()` - Delete document
- `transaction()` - Execute multiple mutations atomically

**Rich Text Methods:**
- `toUniversalRichText()` - Convert native format to universal
- `fromUniversalRichText()` - Convert universal to native format

**Media Methods:**
- `resolveMediaUrl()` - Generate optimized asset URLs
- `getResponsiveImage()` - Create responsive image sets
- `getPlaceholder()` - Generate LQIP/blurhash placeholders

**Type Generation Methods:**
- `generateTypes()` - Generate TypeScript interfaces
- `generateZodSchemas()` - Generate Zod validation schemas

**Helper Methods:**
- `getInfo()` - Get adapter metadata
- `initialize()` - Setup adapter (called after construction)
- `cleanup()` - Cleanup resources

### 2. Error Utilities (`src/utils/errors.ts`)

Comprehensive error class hierarchy:

**Base Error:**
- `ContentBridgeError` - Base class with code, context, and cause

**Specialized Errors:**
- `QueryError` - Query compilation/execution failures
- `MutationError` - Create/update/delete failures
- `DataValidationError` - Schema/data validation failures
- `AdapterError` - Adapter-specific errors
- `CacheError` - Cache operation failures

**Helper Functions:**
- `isContentBridgeError()` - Type guard
- `isErrorType()` - Specific error type checking
- `wrapError()` - Convert native errors to ContentBridge errors

**Features:**
- Stack trace preservation (V8 engines)
- Structured error context
- Error chaining (cause tracking)
- JSON serialization

### 3. Logger Utility (`src/utils/logger.ts`)

Simple structured logging system:

**Features:**
- Log levels: debug, info, warn, error
- Timestamp support
- Custom prefixes
- Global metadata
- Child loggers
- Custom output transports

**Usage:**
```typescript
import { createLogger, createChildLogger } from '@contentbridge/core/utils'

const logger = createLogger({
  level: 'debug',
  prefix: '[MyAdapter]',
  metadata: { adapter: 'sanity' }
})

logger.info('Starting query', { type: 'post' })
logger.error('Query failed', error, { query: groqQuery })

const child = logger.child('[QueryBuilder]', { component: 'query' })
```

### 4. Index Files

- `src/adapters/index.ts` - Export BaseAdapter
- `src/utils/index.ts` - Export errors and logger
- `src/types/index.ts` - Export document and query types
- `src/index.ts` - Main package entry point

### 5. Placeholder Files

Created empty index files for future implementation:
- `src/cache/index.ts`
- `src/plugins/index.ts`

## Type Safety

All code uses TypeScript strict mode with:
- Comprehensive JSDoc comments
- Generic type parameters for type safety
- Union types for exhaustive checking
- Type guards for runtime validation

## Design Decisions

### 1. Transaction Types from Service Layer
Instead of duplicating transaction types, BaseAdapter imports them from the service layer (`ContentService`) to maintain a single source of truth.

### 2. DataValidationError vs ValidationError
- `DataValidationError` (class): For throwing errors during validation
- `ValidationError` (interface in service): Data structure for validation results
- Different concerns, no naming conflict

### 3. Logger in Constructor
The logger can't use `this.name` in the constructor (abstract property not yet available). Subclasses should call `super()` then customize the logger if needed.

### 4. DOM Types
Added "DOM" to lib in tsconfig.base.json to support `console` in the logger without requiring Node.js types.

## Build Configuration

### Package Exports
The package.json now includes a `/utils` export:
```json
"./utils": {
  "types": "./dist/utils/index.d.ts",
  "import": "./dist/utils/index.js"
}
```

### Tsup Config
Added utils entry point to tsup.config.ts for proper bundling.

## Example Adapter Implementation

```typescript
import { BaseAdapter } from '@contentbridge/core/adapters'
import type { QueryConfig, QueryResult } from '@contentbridge/core/types'

class SanityAdapter extends BaseAdapter {
  name = 'sanity' as const
  version = '1.0.0'

  async compileQuery(config: QueryConfig): Promise<string> {
    // Convert to GROQ
    return `*[_type == "${config.type}"]`
  }

  async executeQuery<T>(config: QueryConfig<T>): Promise<QueryResult<T>> {
    const groq = await this.compileQuery(config)
    const data = await this.client.fetch(groq)
    return { data, total: data.length }
  }

  // ... implement other abstract methods
}

const adapter = new SanityAdapter({
  projectId: 'abc123',
  dataset: 'production',
  debug: true
})

await adapter.initialize()
```

## Testing

Type checking passes:
```bash
pnpm typecheck  # ✓ No errors
```

Build succeeds:
```bash
pnpm build      # ✓ ESM + DTS generated
```

## Next Steps

1. Implement concrete adapters (Sanity, Contentful, etc.)
2. Add cache layer functionality
3. Implement rich text converters
4. Add plugin system
5. Write comprehensive tests
6. Add API documentation

## File Structure

```
packages/core/src/
├── adapters/
│   ├── BaseAdapter.ts      # Abstract base adapter class
│   └── index.ts            # Adapter exports
├── cache/
│   └── index.ts            # Placeholder
├── media/
│   └── index.ts            # Media type re-exports
├── plugins/
│   └── index.ts            # Placeholder
├── richtext/
│   └── index.ts            # Rich text type re-exports
├── service/
│   ├── ContentService.ts   # Service interface
│   ├── QueryBuilder.ts     # Query builder
│   ├── MutationBuilder.ts  # Mutation builder
│   └── index.ts            # Service exports
├── types/
│   ├── document.ts         # Document types
│   ├── query.ts            # Query types
│   ├── richtext.ts         # Rich text types (created)
│   ├── media.ts            # Media types (created)
│   └── index.ts            # Type exports
├── utils/
│   ├── errors.ts           # Error classes
│   ├── logger.ts           # Logger utility
│   └── index.ts            # Utility exports
└── index.ts                # Main entry point
```
