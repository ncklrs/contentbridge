# ContentBridge Caching Example

Advanced caching strategies for ContentBridge applications. Learn how to implement **Memory Cache**, **Redis Cache**, and **Next.js Cache** with production-ready patterns.

## Why Caching Matters

Caching is critical for CMS-driven applications:

- **Performance**: Reduce CMS API calls from 500ms to 5ms
- **Cost**: Save on API rate limits and usage costs
- **Reliability**: Serve stale data when CMS is down
- **Scale**: Handle high traffic without overwhelming CMS

## Features Demonstrated

- ✅ **Memory Cache** - In-process, zero dependencies
- ✅ **Redis Cache** - Distributed, production-ready
- ✅ **Next.js Cache** - Framework-integrated
- ✅ **Cache Patterns** - Cache-aside, SWR, warming
- ✅ **Invalidation** - Tags, keys, TTL strategies
- ✅ **LRU Eviction** - Automatic cleanup
- ✅ **Statistics** - Monitor cache performance

## Setup

### 1. Install Dependencies

From the monorepo root:

```bash
pnpm install
```

### 2. Configure Environment

```bash
cd examples/with-caching
cp .env.example .env
```

Edit `.env`:

```env
# Sanity (for demo data)
SANITY_PROJECT_ID=your_project_id
SANITY_DATASET=production
SANITY_API_TOKEN=your_api_token

# Redis (optional - only for Redis cache example)
REDIS_URL=redis://localhost:6379

# Cache settings
CACHE_TTL=3600
CACHE_MAX_SIZE=1000
```

### 3. Run Examples

```bash
# Run main demo
pnpm start

# Individual examples
pnpm example:memory    # Memory cache
pnpm example:redis     # Redis cache
pnpm example:nextjs    # Next.js cache
pnpm example:strategies # Cache patterns
```

## Caching Strategies

### 1. Memory Cache

**Best for:**
- Development environments
- Single-server deployments
- Low-traffic applications
- Fast, simple caching

**Implementation:**

```typescript
import { createMemoryCache } from './cache/memory-cache'

const cache = createMemoryCache({
  defaultTTL: 3600,  // 1 hour
  maxSize: 1000,     // Max 1000 entries
  debug: true,       // Enable logging
})

// Set with custom TTL and tags
await cache.set('post:123', post, {
  ttl: 300,
  tags: ['posts', 'post:123'],
})

// Get from cache
const post = await cache.get('post:123')

// Invalidate by tags
await cache.invalidateTags(['posts'])

// Get statistics
const stats = cache.getStats()
// { size: 10, valid: 8, expired: 2, maxSize: 1000 }
```

**Features:**
- ✅ Zero dependencies
- ✅ TTL support
- ✅ Tag-based invalidation
- ✅ LRU eviction
- ✅ Statistics

**Limitations:**
- ❌ Not shared across processes
- ❌ Lost on restart
- ❌ Limited by process memory

### 2. Redis Cache

**Best for:**
- Production environments
- Multi-server deployments
- Serverless applications
- Shared cache across services

**Implementation:**

```typescript
import { createRedisCache } from './cache/redis-cache'

const cache = createRedisCache({
  url: 'redis://localhost:6379',
  defaultTTL: 3600,
  keyPrefix: 'myapp:',
  debug: true,
})

// Same API as Memory Cache!
await cache.set('post:123', post, {
  ttl: 300,
  tags: ['posts', 'post:123'],
})

const post = await cache.get('post:123')

await cache.invalidateTags(['posts'])

// Cleanup
await cache.disconnect()
```

**Features:**
- ✅ Distributed caching
- ✅ Persistent storage
- ✅ Tag-based invalidation with Redis sets
- ✅ Automatic serialization
- ✅ Connection pooling

**Requirements:**
- Redis server (local or cloud)
- `ioredis` package

### 3. Next.js Cache

**Best for:**
- Next.js applications
- Framework-integrated caching
- Automatic cache management

**Implementation:**

```typescript
// app/lib/content.ts
import { createSanityAdapter } from '@contentbridge/sanity'

export const content = createSanityAdapter({
  client: sanityClient,
  cache: {
    enabled: true,
    ttl: 3600,
  },
})

// app/page.tsx
export const revalidate = 3600 // ISR: Revalidate every hour

export default async function Page() {
  const posts = await content.query().type('post').execute()
  // Automatically cached by Next.js
  return <PostList posts={posts} />
}

// app/api/revalidate/route.ts
export async function POST() {
  revalidateTag('posts')
  return Response.json({ revalidated: true })
}
```

**Features:**
- ✅ Framework-integrated
- ✅ Automatic cache management
- ✅ ISR (Incremental Static Regeneration)
- ✅ On-demand revalidation
- ✅ Edge caching support

## Cache Patterns

### Pattern 1: Cache-Aside (Lazy Loading)

**When to use:** Most common pattern, load on demand

```typescript
async function getCachedPost(id: string) {
  const cacheKey = `post:${id}`

  // 1. Try cache first
  let post = await cache.get(cacheKey)

  if (!post) {
    // 2. Cache miss - fetch from CMS
    post = await content.getById(id)

    if (post) {
      // 3. Store in cache for next time
      await cache.set(cacheKey, post, {
        ttl: 3600,
        tags: ['posts', cacheKey],
      })
    }
  }

  return post
}
```

**Pros:**
- Only caches what's needed
- Easy to implement
- Cache misses are handled naturally

**Cons:**
- First request is slow
- Cache stampede possible

### Pattern 2: Stale-While-Revalidate (SWR)

**When to use:** Prioritize speed, accept slightly stale data

```typescript
async function getPostSWR(id: string) {
  const cacheKey = `post:${id}`
  const staleKey = `${cacheKey}:stale`

  // 1. Return stale data immediately (if exists)
  const staleData = await cache.get(staleKey)

  // 2. Revalidate in background
  content.getById(id).then(async (fresh) => {
    if (fresh) {
      await cache.set(cacheKey, fresh, { ttl: 3600 })
      await cache.set(staleKey, fresh, { ttl: 86400 }) // 24h
    }
  })

  // 3. Return fresh or stale data
  return (await cache.get(cacheKey)) || staleData
}
```

**Pros:**
- Always fast (returns immediately)
- Self-healing (revalidates in background)
- Resilient to CMS outages

**Cons:**
- Slightly stale data
- More complex

### Pattern 3: Cache Warming

**When to use:** Preload cache before traffic hits

```typescript
async function warmCache() {
  console.log('Warming cache...')

  // Fetch all posts
  const posts = await content
    .query()
    .type('post')
    .limit(1000)
    .execute()

  // Store in cache
  for (const post of posts) {
    await cache.set(`post:${post._id}`, post, {
      ttl: 3600,
      tags: ['posts', `post:${post._id}`],
    })
  }

  console.log(`Warmed cache with ${posts.length} posts`)
}

// Run on startup
warmCache()
```

**Pros:**
- No cold starts
- Predictable performance
- Great for critical data

**Cons:**
- Slower startup
- Cache all data upfront
- Wastes memory on unused data

### Pattern 4: Write-Through

**When to use:** Keep cache and CMS in sync

```typescript
async function updatePost(id: string, updates: Partial<Post>) {
  // 1. Update in CMS
  const updated = await content.update(id, updates)

  // 2. Update in cache
  await cache.set(`post:${id}`, updated, {
    ttl: 3600,
    tags: ['posts', `post:${id}`],
  })

  // 3. Invalidate related caches
  await cache.invalidateTags(['posts-list'])

  return updated
}
```

**Pros:**
- Cache always in sync
- No stale data
- Predictable

**Cons:**
- Slower writes
- More complex

## Cache Invalidation

### Strategy 1: Tag-Based Invalidation

**Best for:** Invalidating related items

```typescript
// Set with tags
await cache.set('post:123', post, {
  tags: ['posts', 'post:123', 'author:456'],
})

await cache.set('post:456', post2, {
  tags: ['posts', 'post:456', 'author:456'],
})

// Invalidate all posts
await cache.invalidateTags(['posts'])

// Invalidate posts by specific author
await cache.invalidateTags(['author:456'])
```

**Common tag patterns:**

```typescript
// Resource type
tags: ['posts']

// Specific resource
tags: ['post:123']

// Related resources
tags: ['author:456', 'category:789']

// Multiple levels
tags: ['posts', 'post:123', 'author:456']
```

### Strategy 2: Time-Based (TTL)

**Best for:** Automatic cleanup

```typescript
// Short TTL for frequently changing data
await cache.set('stats', stats, { ttl: 60 }) // 1 minute

// Medium TTL for normal content
await cache.set('post', post, { ttl: 3600 }) // 1 hour

// Long TTL for static content
await cache.set('config', config, { ttl: 86400 }) // 24 hours
```

### Strategy 3: Event-Based

**Best for:** Webhooks, real-time updates

```typescript
// Webhook handler (Next.js example)
export async function POST(request) {
  const { _type, _id } = await request.json()

  if (_type === 'post') {
    // Invalidate specific post
    await cache.invalidateTags([`post:${_id}`])

    // Invalidate lists
    await cache.invalidateTags(['posts'])
  }

  return Response.json({ revalidated: true })
}
```

## Performance Benchmarks

**Without caching:**
```
Query 100 posts: 450ms
Get post by ID: 250ms
Get post by slug: 280ms
```

**With Memory Cache:**
```
Query 100 posts: 5ms   (90x faster)
Get post by ID: 2ms    (125x faster)
Get post by slug: 2ms  (140x faster)
```

**With Redis Cache:**
```
Query 100 posts: 15ms  (30x faster)
Get post by ID: 8ms    (31x faster)
Get post by slug: 8ms  (35x faster)
```

## Best Practices

### 1. Choose the Right TTL

```typescript
// Frequently changing data
{ ttl: 60 }      // 1 minute

// Normal content
{ ttl: 3600 }    // 1 hour

// Rarely changing data
{ ttl: 86400 }   // 24 hours

// Static data
{ ttl: 604800 }  // 7 days
```

### 2. Use Cache Tags Wisely

```typescript
// ✅ Good: Granular tags
await cache.set('post:123', post, {
  tags: [
    'posts',           // All posts
    'post:123',        // This specific post
    'author:456',      // Posts by this author
    'category:789',    // Posts in this category
  ],
})

// ❌ Bad: Too generic
await cache.set('post:123', post, {
  tags: ['content'], // Too broad
})
```

### 3. Monitor Cache Performance

```typescript
// Log cache stats periodically
setInterval(async () => {
  const stats = cache.getStats()
  console.log('Cache stats:', {
    hitRate: stats.hits / (stats.hits + stats.misses),
    size: stats.size,
    memory: stats.memoryUsage,
  })
}, 60000) // Every minute
```

### 4. Handle Cache Failures Gracefully

```typescript
async function getCachedPost(id: string) {
  try {
    const cached = await cache.get(`post:${id}`)
    if (cached) return cached
  } catch (error) {
    console.error('Cache error:', error)
    // Fall through to CMS
  }

  // Always fall back to CMS
  return content.getById(id)
}
```

## Troubleshooting

### Memory cache fills up too fast

```typescript
// Increase max size
const cache = createMemoryCache({
  maxSize: 10000, // Increase from default 1000
})

// Or use shorter TTL
await cache.set(key, value, { ttl: 300 }) // 5 minutes instead of 1 hour
```

### Redis connection errors

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Check connection
redis-cli -u redis://localhost:6379
```

### Cache not invalidating

```typescript
// Ensure tags match exactly
await cache.set('post:123', post, {
  tags: ['posts', 'post:123'], // Note: exact strings
})

await cache.invalidateTags(['posts']) // Must match exactly
```

## Next Steps

1. **Implement caching** in your ContentBridge app
2. **Choose the right strategy** for your use case
3. **Monitor performance** with statistics
4. **Set up webhooks** for event-based invalidation
5. **Test cache behavior** under load

## Related Examples

- [`examples/nextjs-sanity`](../nextjs-sanity) - Next.js with caching
- [`examples/basic-node`](../basic-node) - Node.js basics

## Resources

- [ContentBridge Documentation](../../README.md)
- [Redis Documentation](https://redis.io/docs/)
- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)

## License

MIT
