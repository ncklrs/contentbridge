/**
 * Basic cache usage examples
 *
 * Run with: tsx packages/core/src/cache/examples/basic-usage.ts
 */

import { CacheManager, MemoryCache } from '../index'

async function basicExample() {
  console.log('=== Basic Cache Example ===\n')

  // Create cache with auto-detection
  const cache = CacheManager.create()

  // Set a value
  await cache.set('user:123', {
    id: 123,
    name: 'Alice',
    email: 'alice@example.com',
  })

  // Get the value
  const user = await cache.get('user:123')
  console.log('Retrieved user:', user)

  // Delete the value
  await cache.delete('user:123')
  console.log('After delete:', await cache.get('user:123')) // null

  console.log()
}

async function ttlExample() {
  console.log('=== TTL Example ===\n')

  const cache = new MemoryCache({ defaultTtl: 2 })

  // Set with 1 second TTL
  await cache.set('session:abc', { token: 'secret' }, { ttl: 1 })
  console.log('Set session with 1s TTL')

  // Get immediately
  console.log('Immediately:', await cache.get('session:abc'))

  // Wait 1.5 seconds
  await new Promise((resolve) => setTimeout(resolve, 1500))
  console.log('After 1.5s:', await cache.get('session:abc')) // null

  console.log()
}

async function tagExample() {
  console.log('=== Tag-Based Invalidation Example ===\n')

  const cache = new MemoryCache()

  // Set multiple values with tags
  await cache.set('user:1', { id: 1, name: 'Alice' }, { tags: ['user'] })
  await cache.set('user:2', { id: 2, name: 'Bob' }, { tags: ['user'] })
  await cache.set('post:1', { id: 1, title: 'Hello' }, { tags: ['post'] })

  console.log('Before invalidation:')
  console.log('User 1:', await cache.get('user:1'))
  console.log('User 2:', await cache.get('user:2'))
  console.log('Post 1:', await cache.get('post:1'))

  // Invalidate all user entries
  await cache.invalidateByTags(['user'])

  console.log('\nAfter invalidating "user" tag:')
  console.log('User 1:', await cache.get('user:1')) // null
  console.log('User 2:', await cache.get('user:2')) // null
  console.log('Post 1:', await cache.get('post:1')) // still exists

  console.log()
}

async function lruExample() {
  console.log('=== LRU Eviction Example ===\n')

  const cache = new MemoryCache({ maxSize: 3 })

  // Fill cache to max size
  await cache.set('key1', 'value1')
  await cache.set('key2', 'value2')
  await cache.set('key3', 'value3')

  console.log('Cache stats:', cache.stats())

  // Access key1 to make it recently used
  await cache.get('key1')

  // Add key4 - should evict key2 (least recently used)
  await cache.set('key4', 'value4')

  console.log('\nAfter adding key4:')
  console.log('Key 1:', await cache.get('key1')) // exists
  console.log('Key 2:', await cache.get('key2')) // null (evicted)
  console.log('Key 3:', await cache.get('key3')) // exists
  console.log('Key 4:', await cache.get('key4')) // exists

  console.log()
}

async function sharedCacheExample() {
  console.log('=== Shared Cache Instance Example ===\n')

  // Get shared instance
  const cache1 = CacheManager.shared('my-app')
  await cache1.set('config', { theme: 'dark' })

  // Get same instance elsewhere
  const cache2 = CacheManager.shared('my-app')
  console.log('Config from cache2:', await cache2.get('config'))

  console.log('Same instance?', cache1 === cache2) // true

  console.log()
}

async function environmentDetectionExample() {
  console.log('=== Environment Detection Example ===\n')

  const env = CacheManager.detectEnvironment()
  const recommended = CacheManager.detectCacheType()
  const info = CacheManager.environmentInfo()

  console.log('Environment:', env)
  console.log('Recommended cache type:', recommended)
  console.log('Environment info:', JSON.stringify(info, null, 2))

  console.log()
}

async function main() {
  try {
    await basicExample()
    await ttlExample()
    await tagExample()
    await lruExample()
    await sharedCacheExample()
    await environmentDetectionExample()

    console.log('All examples completed successfully!')
  } catch (error) {
    console.error('Error running examples:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { main }
