/**
 * Next.js cache strategy
 *
 * Wraps Next.js unstable_cache API and revalidateTag functionality
 * Falls back to MemoryCache if not running in Next.js environment
 */

import type { CacheStrategy, CacheOptions } from '../CacheStrategy'
import { MemoryCache } from './MemoryCache'

/**
 * Configuration for NextJSCache
 */
export interface NextJSCacheConfig {
  /**
   * Default revalidation time in seconds
   * @default undefined (no revalidation)
   */
  revalidate?: number | false

  /**
   * Fallback to MemoryCache if not in Next.js
   * @default true
   */
  useFallback?: boolean

  /**
   * Configuration for fallback MemoryCache
   */
  fallbackConfig?: {
    maxSize?: number
    defaultTtl?: number
  }
}

/**
 * Type definitions for Next.js cache functions
 * These avoid importing from 'next/cache' which may not be available
 */
type UnstableCacheFunction = <TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyParts: string[],
  options?: {
    revalidate?: number | false
    tags?: string[]
  }
) => (...args: TArgs) => Promise<TResult>

type RevalidateTagFunction = (tag: string) => void

/**
 * Next.js cache implementation
 *
 * Features:
 * - Integrates with Next.js unstable_cache
 * - Uses revalidateTag for invalidation
 * - Falls back to MemoryCache in non-Next.js environments
 * - Supports both ISR and on-demand revalidation
 */
export class NextJSCache implements CacheStrategy {
  private fallbackCache: MemoryCache
  private defaultRevalidate?: number | false
  private isNextJS: boolean
  private unstable_cache?: UnstableCacheFunction
  private revalidateTag?: RevalidateTagFunction

  constructor(config: NextJSCacheConfig = {}) {
    this.defaultRevalidate = config.revalidate
    this.isNextJS = this.detectNextJS()

    // Initialize Next.js cache functions if available
    if (this.isNextJS) {
      try {
        // Use dynamic require to avoid TypeScript errors when next/cache is not available
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const nextCache = require('next/cache')
        this.unstable_cache = nextCache.unstable_cache
        this.revalidateTag = nextCache.revalidateTag
      } catch {
        this.isNextJS = false
      }
    }

    // Always create fallback cache for get/set operations
    this.fallbackCache = new MemoryCache({
      maxSize: config.fallbackConfig?.maxSize ?? 1000,
      defaultTtl: config.fallbackConfig?.defaultTtl,
    })
  }

  async get<T>(key: string): Promise<T | null> {
    // Next.js cache is primarily for function memoization
    // For direct get/set, we use the fallback cache
    return this.fallbackCache.get<T>(key)
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    // Store in fallback cache for direct access
    await this.fallbackCache.set(key, value, options)
  }

  async delete(key: string): Promise<void> {
    await this.fallbackCache.delete(key)
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    // Use Next.js revalidateTag if available
    if (this.isNextJS && this.revalidateTag) {
      for (const tag of tags) {
        this.revalidateTag(tag)
      }
    }

    // Also invalidate in fallback cache
    await this.fallbackCache.invalidateByTags(tags)
  }

  async clear(): Promise<void> {
    // Next.js doesn't have a clear all function
    // We can only clear the fallback cache
    await this.fallbackCache.clear()
  }

  /**
   * Wrap a function with Next.js cache
   *
   * This is the recommended way to use Next.js caching
   *
   * @param fn - Function to cache
   * @param keyParts - Key parts for cache key generation
   * @param options - Cache options
   * @returns Cached function
   */
  cached<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
    keyParts: string[],
    options?: CacheOptions
  ): (...args: TArgs) => Promise<TResult> {
    if (!this.isNextJS || !this.unstable_cache) {
      // Fallback: manual caching with MemoryCache
      return async (...args: TArgs) => {
        const key = this.generateKey(keyParts, args)
        const cached = await this.fallbackCache.get<TResult>(key)

        if (cached !== null) {
          return cached
        }

        const result = await fn(...args)
        await this.fallbackCache.set(key, result, options)
        return result
      }
    }

    // Use Next.js unstable_cache
    return this.unstable_cache(fn, keyParts, {
      revalidate: options?.ttl ?? this.defaultRevalidate,
      tags: options?.tags,
    })
  }

  /**
   * Get cache statistics
   */
  stats() {
    return {
      isNextJS: this.isNextJS,
      fallback: this.fallbackCache.stats(),
    }
  }

  private detectNextJS(): boolean {
    try {
      // Check if we're in a Next.js environment
      // Next.js sets the NEXT_RUNTIME environment variable
      if (
        typeof process !== 'undefined' &&
        (process.env.NEXT_RUNTIME === 'nodejs' ||
          process.env.NEXT_RUNTIME === 'edge')
      ) {
        return true
      }

      // Check if next/cache module is available
      require.resolve('next/cache')
      return true
    } catch {
      return false
    }
  }

  private generateKey(keyParts: string[], args: unknown[]): string {
    // Generate a cache key from key parts and arguments
    const argKey = JSON.stringify(args)
    return [...keyParts, argKey].join(':')
  }
}
