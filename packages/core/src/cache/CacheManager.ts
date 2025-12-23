/**
 * Cache manager for ContentBridge
 *
 * Factory for creating and managing cache instances
 * Auto-detects environment and provides sensible defaults
 */

import type { CacheStrategy } from './CacheStrategy'
import { MemoryCache, type MemoryCacheConfig } from './strategies/MemoryCache'
import { NextJSCache, type NextJSCacheConfig } from './strategies/NextJSCache'

/**
 * Supported cache types
 */
export type CacheType = 'memory' | 'nextjs' | 'auto'

/**
 * Cache configuration union type
 */
export type CacheConfig = MemoryCacheConfig | NextJSCacheConfig

/**
 * Cache manager configuration
 */
export interface CacheManagerConfig {
  /**
   * Cache type to use
   * @default 'auto'
   */
  type?: CacheType

  /**
   * Type-specific configuration
   */
  config?: CacheConfig
}

/**
 * Runtime environment detection
 */
export type RuntimeEnvironment = 'nextjs' | 'node' | 'browser' | 'edge' | 'unknown'

/**
 * Cache manager for creating and managing cache instances
 *
 * Features:
 * - Auto-detects runtime environment
 * - Provides appropriate cache strategy
 * - Singleton pattern for shared cache instances
 */
export class CacheManager {
  private static instances = new Map<string, CacheStrategy>()

  /**
   * Create a cache instance
   *
   * @param config - Cache configuration
   * @returns Cache strategy instance
   */
  static create(config: CacheManagerConfig = {}): CacheStrategy {
    const type = config.type ?? 'auto'
    const cacheType = type === 'auto' ? this.detectCacheType() : type

    switch (cacheType) {
      case 'nextjs':
        return new NextJSCache(config.config as NextJSCacheConfig)
      case 'memory':
      default:
        return new MemoryCache(config.config as MemoryCacheConfig)
    }
  }

  /**
   * Get or create a shared cache instance
   *
   * @param name - Cache instance name
   * @param config - Cache configuration (used if instance doesn't exist)
   * @returns Shared cache strategy instance
   */
  static shared(name = 'default', config?: CacheManagerConfig): CacheStrategy {
    if (!this.instances.has(name)) {
      this.instances.set(name, this.create(config))
    }
    return this.instances.get(name)!
  }

  /**
   * Clear all shared cache instances
   */
  static async clearAll(): Promise<void> {
    await Promise.all([...this.instances.values()].map((cache) => cache.clear()))
  }

  /**
   * Remove a shared cache instance
   *
   * @param name - Cache instance name
   */
  static remove(name: string): void {
    this.instances.delete(name)
  }

  /**
   * Detect the best cache type for the current environment
   *
   * @returns Recommended cache type
   */
  static detectCacheType(): Exclude<CacheType, 'auto'> {
    const env = this.detectEnvironment()

    switch (env) {
      case 'nextjs':
        return 'nextjs'
      case 'node':
      case 'browser':
      case 'edge':
      case 'unknown':
      default:
        return 'memory'
    }
  }

  /**
   * Detect the current runtime environment
   *
   * @returns Runtime environment
   */
  static detectEnvironment(): RuntimeEnvironment {
    // Check for Next.js
    if (
      typeof process !== 'undefined' &&
      process.env &&
      (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge')
    ) {
      return 'nextjs'
    }

    // Check for edge runtime (Cloudflare Workers, Vercel Edge, etc.)
    if (typeof globalThis !== 'undefined' && 'EdgeRuntime' in globalThis) {
      return 'edge'
    }

    // Check for browser
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      return 'browser'
    }

    // Check for Node.js
    if (typeof process !== 'undefined' && process.versions?.node) {
      return 'node'
    }

    return 'unknown'
  }

  /**
   * Get information about the current environment
   */
  static environmentInfo(): {
    environment: RuntimeEnvironment
    recommendedCacheType: Exclude<CacheType, 'auto'>
    features: {
      hasNextJS: boolean
      hasProcess: boolean
      hasWindow: boolean
      hasEdgeRuntime: boolean
    }
  } {
    const environment = this.detectEnvironment()
    const recommendedCacheType = this.detectCacheType()

    return {
      environment,
      recommendedCacheType,
      features: {
        hasNextJS: environment === 'nextjs',
        hasProcess: typeof process !== 'undefined',
        hasWindow: typeof window !== 'undefined',
        hasEdgeRuntime: typeof globalThis !== 'undefined' && 'EdgeRuntime' in globalThis,
      },
    }
  }
}
