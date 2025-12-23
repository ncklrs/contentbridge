/**
 * In-memory LRU cache with TTL support
 *
 * Works in any JavaScript runtime (Node.js, browser, edge)
 */

import type { CacheStrategy, CacheOptions, CacheEntry } from '../CacheStrategy'

/**
 * Configuration for MemoryCache
 */
export interface MemoryCacheConfig {
  /**
   * Maximum number of entries in the cache
   * When exceeded, least recently used entries are evicted
   * @default 1000
   */
  maxSize?: number

  /**
   * Default TTL in seconds
   * @default undefined (no expiration)
   */
  defaultTtl?: number
}

/**
 * In-memory LRU cache implementation
 *
 * Features:
 * - LRU eviction when maxSize is reached
 * - TTL support with automatic expiration
 * - Tag-based invalidation
 * - Works in any JS runtime
 */
export class MemoryCache implements CacheStrategy {
  private cache: Map<string, CacheEntry<unknown>>
  private accessOrder: string[]
  private tagIndex: Map<string, Set<string>>
  private maxSize: number
  private defaultTtl?: number

  constructor(config: MemoryCacheConfig = {}) {
    this.cache = new Map()
    this.accessOrder = []
    this.tagIndex = new Map()
    this.maxSize = config.maxSize ?? 1000
    this.defaultTtl = config.defaultTtl
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined

    if (!entry) {
      return null
    }

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      await this.delete(key)
      return null
    }

    // Update access order (LRU)
    this.updateAccessOrder(key)

    return entry.value
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    // Evict if at max size and this is a new key
    if (!this.cache.has(key) && this.cache.size >= this.maxSize) {
      await this.evictLRU()
    }

    // Calculate expiration
    const ttl = options?.ttl ?? this.defaultTtl
    const expiresAt = ttl ? Date.now() + ttl * 1000 : undefined

    // Store entry
    const entry: CacheEntry<T> = {
      value,
      expiresAt,
      tags: options?.tags,
    }

    this.cache.set(key, entry)
    this.updateAccessOrder(key)

    // Update tag index
    if (options?.tags) {
      for (const tag of options.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set())
        }
        this.tagIndex.get(tag)!.add(key)
      }
    }
  }

  async delete(key: string): Promise<void> {
    const entry = this.cache.get(key)
    if (!entry) {
      return
    }

    // Remove from cache
    this.cache.delete(key)

    // Remove from access order
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }

    // Remove from tag index
    if (entry.tags) {
      for (const tag of entry.tags) {
        this.tagIndex.get(tag)?.delete(key)
        // Clean up empty tag sets
        if (this.tagIndex.get(tag)?.size === 0) {
          this.tagIndex.delete(tag)
        }
      }
    }
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    const keysToDelete = new Set<string>()

    for (const tag of tags) {
      const keys = this.tagIndex.get(tag)
      if (keys) {
        keys.forEach((key) => keysToDelete.add(key))
      }
    }

    await Promise.all([...keysToDelete].map((key) => this.delete(key)))
  }

  async clear(): Promise<void> {
    this.cache.clear()
    this.accessOrder = []
    this.tagIndex.clear()
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Get cache statistics
   */
  stats(): {
    size: number
    maxSize: number
    tagCount: number
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      tagCount: this.tagIndex.size,
    }
  }

  private updateAccessOrder(key: string): void {
    // Remove from current position
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
    // Add to end (most recently used)
    this.accessOrder.push(key)
  }

  private async evictLRU(): Promise<void> {
    // Evict least recently used (first in array)
    const lruKey = this.accessOrder[0]
    if (lruKey) {
      await this.delete(lruKey)
    }
  }
}
