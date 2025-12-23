/**
 * In-Memory Cache Implementation
 *
 * Simple, fast cache that stores data in process memory.
 * Perfect for development and single-server deployments.
 *
 * Features:
 * - TTL (Time To Live) support
 * - Tag-based invalidation
 * - LRU eviction when max size reached
 * - No external dependencies
 */

interface CacheEntry<T = unknown> {
  value: T
  expiresAt: number
  tags: string[]
}

export interface MemoryCacheOptions {
  /**
   * Default TTL in seconds
   * @default 3600 (1 hour)
   */
  defaultTTL?: number

  /**
   * Maximum number of entries
   * @default 1000
   */
  maxSize?: number

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean
}

export class MemoryCache {
  private cache = new Map<string, CacheEntry>()
  private accessTimes = new Map<string, number>()
  private options: Required<MemoryCacheOptions>

  constructor(options: MemoryCacheOptions = {}) {
    this.options = {
      defaultTTL: options.defaultTTL ?? 3600,
      maxSize: options.maxSize ?? 1000,
      debug: options.debug ?? false,
    }
  }

  /**
   * Get a value from cache
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)

    if (!entry) {
      this.log('MISS', key)
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.accessTimes.delete(key)
      this.log('EXPIRED', key)
      return null
    }

    // Update access time for LRU
    this.accessTimes.set(key, Date.now())
    this.log('HIT', key)
    return entry.value as T
  }

  /**
   * Set a value in cache
   */
  async set<T = unknown>(
    key: string,
    value: T,
    options: { ttl?: number; tags?: string[] } = {}
  ): Promise<void> {
    const ttl = options.ttl ?? this.options.defaultTTL
    const tags = options.tags ?? []

    // Evict if at max size
    if (this.cache.size >= this.options.maxSize) {
      this.evictLRU()
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
      tags,
    })

    this.accessTimes.set(key, Date.now())
    this.log('SET', key, { ttl, tags })
  }

  /**
   * Delete a specific key
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key)
    this.accessTimes.delete(key)
    this.log('DELETE', key)
  }

  /**
   * Invalidate all keys with specific tags
   */
  async invalidateTags(tags: string[]): Promise<void> {
    const tagsSet = new Set(tags)
    let invalidatedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      const hasTag = entry.tags.some((tag) => tagsSet.has(tag))
      if (hasTag) {
        this.cache.delete(key)
        this.accessTimes.delete(key)
        invalidatedCount++
      }
    }

    this.log('INVALIDATE_TAGS', tags.join(', '), { count: invalidatedCount })
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    this.cache.clear()
    this.accessTimes.clear()
    this.log('CLEAR')
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())

    const expired = entries.filter(([_, entry]) => entry.expiresAt < now).length
    const valid = entries.length - expired

    return {
      size: this.cache.size,
      valid,
      expired,
      maxSize: this.options.maxSize,
      fillPercent: (this.cache.size / this.options.maxSize) * 100,
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, time] of this.accessTimes.entries()) {
      if (time < oldestTime) {
        oldestTime = time
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.accessTimes.delete(oldestKey)
      this.log('EVICT', oldestKey)
    }
  }

  /**
   * Debug logging
   */
  private log(action: string, key?: string, meta?: Record<string, unknown>): void {
    if (!this.options.debug) return

    const timestamp = new Date().toISOString()
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
    console.log(`[MemoryCache] ${timestamp} ${action} ${key || ''}${metaStr}`)
  }
}

/**
 * Create a memory cache instance
 */
export function createMemoryCache(options?: MemoryCacheOptions): MemoryCache {
  return new MemoryCache(options)
}
