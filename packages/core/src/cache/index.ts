/**
 * Cache module for ContentBridge
 *
 * Provides pluggable caching strategies for query results and other data.
 *
 * @example
 * ```typescript
 * import { CacheManager, MemoryCache } from '@contentbridge/core/cache'
 *
 * // Auto-detect and create cache
 * const cache = CacheManager.create()
 *
 * // Use shared cache instance
 * const sharedCache = CacheManager.shared('my-cache')
 *
 * // Create specific cache type
 * const memoryCache = new MemoryCache({ maxSize: 500 })
 *
 * // Cache operations
 * await cache.set('key', { data: 'value' }, { ttl: 3600, tags: ['user'] })
 * const value = await cache.get('key')
 * await cache.invalidateByTags(['user'])
 * ```
 */

// Core types
export type { CacheStrategy, CacheOptions, CacheEntry } from './CacheStrategy'

// Cache implementations
export { MemoryCache, type MemoryCacheConfig } from './strategies/MemoryCache'
export { NextJSCache, type NextJSCacheConfig } from './strategies/NextJSCache'

// Cache manager
export {
  CacheManager,
  type CacheType,
  type CacheConfig,
  type CacheManagerConfig,
  type RuntimeEnvironment,
} from './CacheManager'
