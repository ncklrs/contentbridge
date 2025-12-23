# ContentBridge Cache Implementation

## Overview

A complete, production-ready caching system for the ContentBridge monorepo with pluggable strategies, tag-based invalidation, TTL support, and runtime environment auto-detection.

## Implementation Summary

### Files Created

```
packages/core/src/cache/
├── CacheStrategy.ts                    # Core interface and types
├── CacheManager.ts                     # Factory and environment detection
├── index.ts                            # Public exports
├── README.md                           # Comprehensive documentation
├── strategies/
│   ├── MemoryCache.ts                  # In-memory LRU cache
│   └── NextJSCache.ts                  # Next.js integration
├── __tests__/
│   ├── MemoryCache.test.ts            # Unit tests (13 tests)
│   └── CacheManager.test.ts           # Unit tests (17 tests)
└── examples/
    └── basic-usage.ts                  # Usage examples
```

### Configuration Updates

1. **package.json** - Added `./cache` export path
2. **tsup.config.ts** - Added `cache/index` entry point
3. All files build successfully with TypeScript and generate proper type definitions

## Features Implemented

### 1. CacheStrategy Interface

Core abstraction with these operations:
- `get<T>(key: string): Promise<T | null>`
- `set<T>(key: string, value: T, options?: CacheOptions): Promise<void>`
- `delete(key: string): Promise<void>`
- `invalidateByTags(tags: string[]): Promise<void>`
- `clear(): Promise<void>`

### 2. MemoryCache Strategy

**Features:**
- ✅ In-memory LRU cache with configurable max size
- ✅ TTL support with automatic expiration
- ✅ Tag-based invalidation
- ✅ Works in any JavaScript runtime (Node.js, browser, edge)
- ✅ Efficient O(1) get/set operations
- ✅ Statistics tracking

**Configuration:**
```typescript
{
  maxSize?: number      // Default: 1000
  defaultTtl?: number   // Default: undefined (no expiration)
}
```

### 3. NextJSCache Strategy

**Features:**
- ✅ Wraps Next.js `unstable_cache` API
- ✅ Integrates with `revalidateTag` for invalidation
- ✅ Falls back to MemoryCache in non-Next.js environments
- ✅ Supports function memoization with `.cached()`
- ✅ Runtime detection of Next.js environment

**Configuration:**
```typescript
{
  revalidate?: number | false          // Default revalidation time
  useFallback?: boolean                // Use MemoryCache fallback
  fallbackConfig?: MemoryCacheConfig   // Fallback configuration
}
```

### 4. CacheManager Factory

**Features:**
- ✅ Auto-detects runtime environment (nextjs, node, browser, edge, unknown)
- ✅ Recommends best cache strategy for environment
- ✅ Shared cache instances with singleton pattern
- ✅ Environment information API

**Methods:**
- `create(config?)` - Create new cache instance
- `shared(name?, config?)` - Get or create shared instance
- `clearAll()` - Clear all shared instances
- `detectEnvironment()` - Detect runtime
- `detectCacheType()` - Get recommended cache type
- `environmentInfo()` - Get detailed environment info

## Usage Examples

### Quick Start

```typescript
import { CacheManager } from '@contentbridge/core/cache'

const cache = CacheManager.create()
await cache.set('key', 'value', { ttl: 3600, tags: ['user'] })
const value = await cache.get('key')
```

### With ContentService

```typescript
import { ContentService } from '@contentbridge/core/service'
import { CacheManager } from '@contentbridge/core/cache'

const cache = CacheManager.shared('content')
const service = new ContentService(adapter)

async function getPost(slug: string) {
  const cacheKey = `post:${slug}`
  const cached = await cache.get(cacheKey)
  if (cached) return cached

  const post = await service.query('post').where({ slug }).first().execute()
  if (post) {
    await cache.set(cacheKey, post, {
      ttl: 3600,
      tags: ['post', `slug:${slug}`]
    })
  }
  return post
}
```

## Testing

### Test Coverage

- **30 total tests** (all passing)
- **MemoryCache**: 13 comprehensive tests
  - Get/set operations
  - TTL expiration
  - LRU eviction
  - Tag-based invalidation
  - Delete and clear operations
  - Statistics
- **CacheManager**: 17 tests
  - Factory creation
  - Shared instances
  - Environment detection
  - Configuration handling

### Running Tests

```bash
cd packages/core
pnpm test src/cache
```

## Build Verification

### Build Output

```bash
pnpm build
```

**Generated files:**
- `dist/cache/index.js` - ESM bundle
- `dist/cache/index.d.ts` - TypeScript definitions
- `dist/cache/index.js.map` - Source maps

### Package Exports

```json
{
  "./cache": {
    "types": "./dist/cache/index.d.ts",
    "import": "./dist/cache/index.js"
  }
}
```

## Performance Characteristics

### MemoryCache

| Operation | Time Complexity | Space Complexity |
|-----------|----------------|------------------|
| get | O(1) | O(1) |
| set | O(1) average, O(n) worst* | O(1) |
| delete | O(1) | O(1) |
| invalidateByTags | O(m)** | O(1) |
| clear | O(n) | O(n) |

*Worst case when LRU eviction triggers
**Where m is number of entries with matching tags

### Memory Usage

- Each cache entry: ~100-200 bytes (plus value size)
- Tag index: ~50 bytes per unique tag
- Access order tracking: ~8 bytes per entry

## API Documentation

### Complete TypeScript Definitions

All types are fully documented with TSDoc comments. See:
- `dist/cache/index.d.ts` for complete type definitions
- `src/cache/README.md` for usage documentation

### Exported Types

```typescript
// Core
export type { CacheStrategy, CacheOptions, CacheEntry }

// Implementations
export { MemoryCache, type MemoryCacheConfig }
export { NextJSCache, type NextJSCacheConfig }

// Manager
export {
  CacheManager,
  type CacheType,
  type CacheConfig,
  type CacheManagerConfig,
  type RuntimeEnvironment
}
```

## Integration Guide

### Installation

```bash
# In your ContentBridge project
import { CacheManager } from '@contentbridge/core/cache'
```

### Basic Pattern

```typescript
// 1. Create or get shared cache
const cache = CacheManager.shared('my-feature')

// 2. Try cache first
const cached = await cache.get<MyType>(key)
if (cached) return cached

// 3. Fetch fresh data
const fresh = await fetchData()

// 4. Store in cache
await cache.set(key, fresh, {
  ttl: 3600,
  tags: ['feature', 'data']
})

return fresh
```

### Advanced Pattern with Helper

```typescript
async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  const cache = CacheManager.shared('app')
  const cached = await cache.get<T>(key)
  if (cached !== null) return cached

  const fresh = await fetcher()
  await cache.set(key, fresh, options)
  return fresh
}
```

## Future Enhancements

Potential additions to consider:

1. **RedisCache** - Redis-based distributed cache
2. **StorageCache** - Browser localStorage/sessionStorage
3. **Cache Middleware** - Express/Next.js middleware
4. **Cache Decorators** - TypeScript decorators for caching
5. **Metrics** - Hit/miss rate tracking
6. **Cache Warming** - Proactive cache population
7. **Compression** - Automatic value compression for large objects

## TypeScript Support

Full type safety with generics:

```typescript
interface User {
  id: number
  name: string
}

// Type-safe operations
const user = await cache.get<User>('user:123')
await cache.set<User>('user:123', { id: 123, name: 'Alice' })
```

## Runtime Compatibility

- ✅ Node.js 18+
- ✅ Next.js 14+ (with enhanced features)
- ✅ Browser (modern)
- ✅ Edge runtimes (Cloudflare Workers, Vercel Edge)
- ✅ Deno/Bun (untested but should work)

## License

MIT

## Documentation

- **README**: `/packages/core/src/cache/README.md`
- **Examples**: `/packages/core/src/cache/examples/basic-usage.ts`
- **Tests**: `/packages/core/src/cache/__tests__/`
- **This File**: Implementation summary and integration guide
