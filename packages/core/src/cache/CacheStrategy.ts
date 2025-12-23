/**
 * Cache strategy interface for ContentBridge
 *
 * Provides a unified interface for different caching implementations
 * (memory, Next.js, Redis, etc.)
 */

/**
 * Options for cache operations
 */
export interface CacheOptions {
  /**
   * Time-to-live in seconds
   * If not provided, cache entry will not expire automatically
   */
  ttl?: number

  /**
   * Tags for cache invalidation
   * Allows invalidating multiple cache entries by tag
   */
  tags?: string[]
}

/**
 * Cache strategy interface
 *
 * All cache implementations must implement this interface
 */
export interface CacheStrategy {
  /**
   * Get a value from the cache
   *
   * @param key - Cache key
   * @returns The cached value or null if not found/expired
   */
  get<T>(key: string): Promise<T | null>

  /**
   * Set a value in the cache
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Cache options (TTL, tags)
   */
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>

  /**
   * Delete a specific cache entry
   *
   * @param key - Cache key to delete
   */
  delete(key: string): Promise<void>

  /**
   * Invalidate all cache entries with matching tags
   *
   * @param tags - Tags to invalidate
   */
  invalidateByTags(tags: string[]): Promise<void>

  /**
   * Clear all cache entries
   */
  clear(): Promise<void>
}

/**
 * Cache entry metadata for internal storage
 */
export interface CacheEntry<T> {
  value: T
  expiresAt?: number
  tags?: string[]
}
