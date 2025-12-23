/**
 * CachePlugin - Built-in plugin for caching query results
 *
 * Integrates with ContentBridge cache strategies to cache query results
 * and invalidate cache on mutations.
 */

import { createPlugin } from '../utils'
import type { CacheStrategy } from '../../cache/CacheStrategy'
import type { QueryConfig } from '../../types/query'

/**
 * Cache plugin configuration
 */
export interface CachePluginOptions {
  /**
   * Cache strategy instance
   */
  cache: CacheStrategy

  /**
   * Default TTL in seconds
   * @default 3600 (1 hour)
   */
  defaultTTL?: number

  /**
   * Generate cache key from query
   * @default JSON.stringify(query)
   */
  getCacheKey?: (query: QueryConfig) => string

  /**
   * Determine if a query should be cached
   * @default () => true
   */
  shouldCache?: (query: QueryConfig) => boolean

  /**
   * Generate cache tags from query
   * Useful for invalidating related cache entries
   * @default (query) => [query.type]
   */
  getCacheTags?: (query: QueryConfig) => string[]

  /**
   * Cache read operations (getById, getBySlug)
   * @default true
   */
  cacheReads?: boolean

  /**
   * Auto-invalidate cache on mutations
   * @default true
   */
  autoInvalidate?: boolean

  /**
   * Invalidate all caches on any mutation
   * @default false
   */
  invalidateAll?: boolean
}

/**
 * Default cache key generator
 * Creates a deterministic key from query config
 */
function defaultGetCacheKey(query: QueryConfig): string {
  // Create a stable key by sorting object keys
  const stable = JSON.stringify(query, Object.keys(query).sort())
  return `query:${stable}`
}

/**
 * Default cache tags generator
 * Extracts document types as tags
 */
function defaultGetCacheTags(query: QueryConfig): string[] {
  const types = Array.isArray(query.type) ? query.type : [query.type]
  return types.map(type => `type:${type}`)
}

/**
 * Create a cache plugin
 *
 * @param options - Cache configuration
 * @returns Cache plugin
 *
 * @example
 * ```typescript
 * import { createCachePlugin } from '@contentbridge/core/plugins'
 * import { MemoryCache } from '@contentbridge/core/cache'
 *
 * const cache = new MemoryCache({ maxSize: 1000 })
 *
 * const cachePlugin = createCachePlugin({
 *   cache,
 *   defaultTTL: 3600,
 *   shouldCache: (query) => {
 *     // Don't cache queries with includeDrafts
 *     return !query.includeDrafts
 *   },
 *   getCacheTags: (query) => {
 *     // Tag by type and locale
 *     const types = Array.isArray(query.type) ? query.type : [query.type]
 *     const tags = types.map(t => `type:${t}`)
 *     if (query.locale) {
 *       tags.push(`locale:${query.locale}`)
 *     }
 *     return tags
 *   }
 * })
 *
 * await registry.register(cachePlugin)
 * ```
 */
export function createCachePlugin(options: CachePluginOptions) {
  const {
    cache,
    defaultTTL = 3600,
    getCacheKey = defaultGetCacheKey,
    shouldCache = () => true,
    getCacheTags = defaultGetCacheTags,
    cacheReads = true,
    autoInvalidate = true,
    invalidateAll = false,
  } = options

  return createPlugin({
    name: 'cache',
    version: '1.0.0',
    description: 'Caches query results and auto-invalidates on mutations',
    author: 'ContentBridge',
    priority: 50, // Run before logging, after validation

    onInit(context) {
      context.logger.info('Cache plugin initialized', {
        defaultTTL,
        cacheReads,
        autoInvalidate,
        invalidateAll,
      })
    },

    async onDestroy(context) {
      // Optionally clear cache on shutdown
      context.logger.info('Cache plugin destroyed')
    },

    async onBeforeQuery(query, context) {
      // Skip if caching disabled for this query
      if (query.cache?.noCache || !shouldCache(query)) {
        return {}
      }

      // Skip if explicitly disabled
      if (!cacheReads) {
        return {}
      }

      // Generate cache key
      const cacheKey = getCacheKey(query)

      // Try to get from cache
      try {
        const cached = await cache.get<any>(cacheKey)
        if (cached) {
          context.logger.debug('Cache hit', { cacheKey, type: query.type })

          // Return early with cached result
          // Cached value should be a QueryResult
          return {
            result: {
              ...cached,
              cacheStatus: 'hit' as const,
            } as any,
            skipRemaining: false, // Let other plugins run
          }
        }

        context.logger.debug('Cache miss', { cacheKey, type: query.type })
      } catch (error) {
        context.logger.error('Cache get error', error as Error, { cacheKey })
      }

      return {}
    },

    async onAfterQuery(result, query, context) {
      // Skip if already from cache or caching disabled
      if (
        result.cacheStatus === 'hit' ||
        query.cache?.noCache ||
        !shouldCache(query)
      ) {
        return { result }
      }

      // Skip if explicitly disabled
      if (!cacheReads) {
        return { result }
      }

      // Generate cache key and tags
      const cacheKey = getCacheKey(query)
      const tags = getCacheTags(query)

      // Determine TTL
      const ttl = query.cache?.ttl ?? defaultTTL

      // Cache the result
      try {
        await cache.set(cacheKey, result, { ttl, tags })
        context.logger.debug('Cached query result', {
          cacheKey,
          type: query.type,
          ttl,
          tags,
        })

        // Mark result as cached
        return {
          result: {
            ...result,
            cacheStatus: 'miss' as const,
          },
        }
      } catch (error) {
        context.logger.error('Cache set error', error as Error, { cacheKey })
        return { result }
      }
    },

    async onAfterMutation(result, operation, context) {
      if (!autoInvalidate) {
        return { result }
      }

      try {
        if (invalidateAll) {
          // Clear entire cache
          await cache.clear()
          context.logger.debug('Cleared all cache entries')
        } else {
          // Invalidate by document type
          const type = result._type
          const tags = [`type:${type}`]

          // Add additional tags based on operation
          if (operation.type === 'update' || operation.type === 'delete') {
            tags.push(`id:${result._id}`)
          }

          await cache.invalidateByTags(tags)
          context.logger.debug('Invalidated cache by tags', { tags })
        }
      } catch (error) {
        context.logger.error('Cache invalidation error', error as Error)
      }

      return { result }
    },
  })
}

/**
 * Create a simple cache plugin with memory cache
 *
 * @param options - Optional configuration
 * @returns Cache plugin with memory cache
 *
 * @example
 * ```typescript
 * import { createMemoryCachePlugin } from '@contentbridge/core/plugins'
 *
 * const cachePlugin = createMemoryCachePlugin({
 *   maxSize: 500,
 *   defaultTTL: 1800
 * })
 *
 * await registry.register(cachePlugin)
 * ```
 */
export async function createMemoryCachePlugin(
  options: Omit<CachePluginOptions, 'cache'> & { maxSize?: number } = {}
): Promise<ReturnType<typeof createPlugin>> {
  // Dynamically import MemoryCache to avoid circular dependencies
  const { MemoryCache } = await import('../../cache/strategies/MemoryCache')

  const { maxSize = 1000, ...pluginOptions } = options

  const memoryCache = new MemoryCache({ maxSize })

  return createCachePlugin({
    ...pluginOptions,
    cache: memoryCache,
  })
}
