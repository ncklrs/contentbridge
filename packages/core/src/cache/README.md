# ContentBridge Cache System

Pluggable caching strategies for ContentBridge query results and data.

## Features

- **Multiple Strategies**: MemoryCache, NextJSCache, and extensible interface
- **Tag-Based Invalidation**: Group cache entries by tags for easy invalidation
- **TTL Support**: Automatic expiration with time-to-live
- **LRU Eviction**: Memory-efficient with least-recently-used eviction
- **Environment Detection**: Auto-selects best strategy for your runtime
- **TypeScript**: Full type safety with generics

## Installation

```bash
npm install @contentbridge/core
# or
pnpm add @contentbridge/core
# or
yarn add @contentbridge/core
```

## Quick Start

### Auto-Detect Best Cache Strategy

```typescript
import { CacheManager } from '@contentbridge/core/cache'

// Auto-detect and create cache (uses MemoryCache in Node.js, NextJSCache in Next.js)
const cache = CacheManager.create()

// Use it
await cache.set('user:123', { id: 123, name: 'Alice' }, {
  ttl: 3600, // 1 hour
  tags: ['user', 'profile']
})

const user = await cache.get('user:123')
console.log(user) // { id: 123, name: 'Alice' }

// Invalidate by tag
await cache.invalidateByTags(['user'])
```

### Use Shared Cache Instance

```typescript
import { CacheManager } from '@contentbridge/core/cache'

// Get or create a shared cache instance
const cache = CacheManager.shared('my-app')

// Use it anywhere in your app
await cache.set('key', 'value')

// Same instance in another file
const sameCache = CacheManager.shared('my-app')
const value = await sameCache.get('key') // 'value'
```

## Cache Strategies

### MemoryCache

In-memory LRU cache with TTL support. Works in any JavaScript runtime.

```typescript
import { MemoryCache } from '@contentbridge/core/cache'

const cache = new MemoryCache({
  maxSize: 1000,      // Maximum number of entries
  defaultTtl: 3600,   // Default TTL in seconds
})

// Set with TTL
await cache.set('session:abc', sessionData, { ttl: 1800 })

// Set with tags for batch invalidation
await cache.set('post:1', postData, {
  ttl: 3600,
  tags: ['post', 'content']
})

// Get cache statistics
const stats = cache.stats()
console.log(stats)
// { size: 10, maxSize: 1000, tagCount: 2 }
```

**Features:**
- LRU eviction when `maxSize` is reached
- TTL expiration (checks on get)
- Tag-based invalidation
- Memory-efficient
- Works in Node.js, browser, edge runtimes

### NextJSCache

Wraps Next.js `unstable_cache` and `revalidateTag` APIs. Falls back to MemoryCache if not in Next.js environment.

```typescript
import { NextJSCache } from '@contentbridge/core/cache'

const cache = new NextJSCache({
  revalidate: 3600,  // Default revalidation time
})

// Basic usage (uses fallback MemoryCache)
await cache.set('key', 'value', { tags: ['content'] })

// Recommended: Wrap functions with Next.js cache
const getUser = cache.cached(
  async (userId: string) => {
    // Fetch user from database
    return await db.users.findById(userId)
  },
  ['user'], // Cache key parts
  {
    ttl: 3600,
    tags: ['user']
  }
)

// Use the cached function
const user = await getUser('123')

// Invalidate using Next.js revalidateTag
await cache.invalidateByTags(['user'])
```

**Features:**
- Integrates with Next.js Data Cache
- Uses `revalidateTag` for invalidation
- Falls back to MemoryCache in non-Next.js environments
- Function memoization with `.cached()`

## Cache Operations

### Set

```typescript
await cache.set('key', { data: 'value' }, {
  ttl: 3600,              // Time-to-live in seconds
  tags: ['user', 'auth']  // Tags for invalidation
})
```

### Get

```typescript
// With type inference
interface User {
  id: number
  name: string
}

const user = await cache.get<User>('user:123')
// user is User | null
```

### Delete

```typescript
await cache.delete('key')
```

### Invalidate by Tags

```typescript
// Invalidate all entries with 'user' or 'profile' tags
await cache.invalidateByTags(['user', 'profile'])
```

### Clear All

```typescript
await cache.clear()
```

## Advanced Usage

### Environment Detection

```typescript
import { CacheManager } from '@contentbridge/core/cache'

const env = CacheManager.detectEnvironment()
// 'nextjs' | 'node' | 'browser' | 'edge' | 'unknown'

const info = CacheManager.environmentInfo()
console.log(info)
/*
{
  environment: 'node',
  recommendedCacheType: 'memory',
  features: {
    hasNextJS: false,
    hasProcess: true,
    hasWindow: false,
    hasEdgeRuntime: false
  }
}
*/
```

### Custom Cache Strategy

Implement the `CacheStrategy` interface:

```typescript
import type { CacheStrategy, CacheOptions } from '@contentbridge/core/cache'

class RedisCache implements CacheStrategy {
  async get<T>(key: string): Promise<T | null> {
    // Implementation
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    // Implementation
  }

  async delete(key: string): Promise<void> {
    // Implementation
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    // Implementation
  }

  async clear(): Promise<void> {
    // Implementation
  }
}
```

## Integration with ContentService

```typescript
import { ContentService } from '@contentbridge/core/service'
import { CacheManager } from '@contentbridge/core/cache'

const cache = CacheManager.shared('content')
const service = new ContentService(adapter)

// Query with caching
async function getPost(slug: string) {
  const cacheKey = `post:${slug}`

  // Try cache first
  const cached = await cache.get(cacheKey)
  if (cached) return cached

  // Fetch from CMS
  const post = await service
    .query('post')
    .where({ slug })
    .first()
    .execute()

  // Cache for 1 hour with tags
  if (post) {
    await cache.set(cacheKey, post, {
      ttl: 3600,
      tags: ['post', `slug:${slug}`]
    })
  }

  return post
}

// Invalidate when content changes
async function updatePost(slug: string, data: any) {
  await service.mutate('post').where({ slug }).update(data)

  // Invalidate cache
  await cache.invalidateByTags([`slug:${slug}`])
}
```

## Best Practices

### 1. Use Tags for Related Data

```typescript
// Tag user data with user ID and type
await cache.set('user:123', userData, {
  tags: ['user', 'user:123']
})

await cache.set('user:123:posts', userPosts, {
  tags: ['post', 'user:123']
})

// Invalidate all user-related data
await cache.invalidateByTags(['user:123'])
```

### 2. Set Appropriate TTLs

```typescript
// Short TTL for frequently changing data
await cache.set('live-stats', stats, { ttl: 60 }) // 1 minute

// Long TTL for stable data
await cache.set('site-config', config, { ttl: 86400 }) // 24 hours

// No TTL for data that changes only on update
await cache.set('user:settings', settings, {
  tags: ['user:123', 'settings']
})
```

### 3. Use Shared Instances

```typescript
// Don't create new instances repeatedly
// BAD
function getData() {
  const cache = CacheManager.create()
  return cache.get('key')
}

// GOOD
const cache = CacheManager.shared('app')

function getData() {
  return cache.get('key')
}
```

### 4. Handle Cache Misses

```typescript
async function getWithFallback<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  const cached = await cache.get<T>(key)
  if (cached !== null) return cached

  const fresh = await fetcher()
  await cache.set(key, fresh, options)
  return fresh
}
```

## TypeScript Support

Full type safety with generics:

```typescript
interface User {
  id: number
  name: string
  email: string
}

// Type-safe get
const user = await cache.get<User>('user:123')
if (user) {
  console.log(user.name) // ✓ TypeScript knows this is a string
}

// Type-safe set
await cache.set<User>('user:123', {
  id: 123,
  name: 'Alice',
  email: 'alice@example.com'
})
```

## Performance Considerations

### MemoryCache

- **Memory Usage**: O(n) where n is number of entries
- **Get**: O(1)
- **Set**: O(1) average, O(n) worst case when evicting
- **Tag Invalidation**: O(m) where m is number of entries with matching tags

### NextJSCache

- **Fallback**: Uses MemoryCache for direct operations
- **Next.js Integration**: Performance depends on Next.js Data Cache
- **Tag Invalidation**: O(1) for Next.js tags, O(m) for fallback

## API Reference

See the [TypeScript definitions](./index.ts) for complete API documentation.

## License

MIT
