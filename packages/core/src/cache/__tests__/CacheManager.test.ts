/**
 * Unit tests for CacheManager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CacheManager } from '../CacheManager'
import { MemoryCache } from '../strategies/MemoryCache'
import { NextJSCache } from '../strategies/NextJSCache'

describe('CacheManager', () => {
  afterEach(() => {
    // Clean up shared instances between tests
    CacheManager.remove('default')
    CacheManager.remove('test')
  })

  describe('create', () => {
    it('should create a MemoryCache by default', () => {
      const cache = CacheManager.create()
      expect(cache).toBeInstanceOf(MemoryCache)
    })

    it('should create a MemoryCache when type is "memory"', () => {
      const cache = CacheManager.create({ type: 'memory' })
      expect(cache).toBeInstanceOf(MemoryCache)
    })

    it('should create a NextJSCache when type is "nextjs"', () => {
      const cache = CacheManager.create({ type: 'nextjs' })
      expect(cache).toBeInstanceOf(NextJSCache)
    })

    it('should pass config to the cache implementation', async () => {
      const cache = CacheManager.create({
        type: 'memory',
        config: { maxSize: 100 },
      })

      expect(cache).toBeInstanceOf(MemoryCache)
      // @ts-expect-error - accessing private field for testing
      expect(cache.maxSize).toBe(100)
    })
  })

  describe('shared', () => {
    it('should return the same instance for the same name', () => {
      const cache1 = CacheManager.shared('test')
      const cache2 = CacheManager.shared('test')
      expect(cache1).toBe(cache2)
    })

    it('should return different instances for different names', () => {
      const cache1 = CacheManager.shared('test1')
      const cache2 = CacheManager.shared('test2')
      expect(cache1).not.toBe(cache2)
    })

    it('should create instance with config on first call', () => {
      const cache = CacheManager.shared('test', {
        type: 'memory',
        config: { maxSize: 50 },
      })

      expect(cache).toBeInstanceOf(MemoryCache)
    })

    it('should ignore config on subsequent calls', () => {
      const cache1 = CacheManager.shared('test', {
        type: 'memory',
        config: { maxSize: 50 },
      })

      // Second call with different config should return same instance
      const cache2 = CacheManager.shared('test', {
        type: 'memory',
        config: { maxSize: 100 },
      })

      expect(cache1).toBe(cache2)
    })

    it('should share data between references', async () => {
      const cache1 = CacheManager.shared('test')
      const cache2 = CacheManager.shared('test')

      await cache1.set('key', 'value')
      const result = await cache2.get('key')

      expect(result).toBe('value')
    })
  })

  describe('remove', () => {
    it('should remove a shared instance', () => {
      const cache1 = CacheManager.shared('test')
      CacheManager.remove('test')
      const cache2 = CacheManager.shared('test')

      expect(cache1).not.toBe(cache2)
    })
  })

  describe('clearAll', () => {
    it('should clear all shared cache instances', async () => {
      const cache1 = CacheManager.shared('test1')
      const cache2 = CacheManager.shared('test2')

      await cache1.set('key1', 'value1')
      await cache2.set('key2', 'value2')

      await CacheManager.clearAll()

      expect(await cache1.get('key1')).toBeNull()
      expect(await cache2.get('key2')).toBeNull()
    })
  })

  describe('detectEnvironment', () => {
    it('should detect environment', () => {
      const env = CacheManager.detectEnvironment()
      expect(env).toMatch(/^(nextjs|node|browser|edge|unknown)$/)
    })

    it('should detect node environment in tests', () => {
      const env = CacheManager.detectEnvironment()
      expect(env).toBe('node')
    })
  })

  describe('detectCacheType', () => {
    it('should return a cache type', () => {
      const type = CacheManager.detectCacheType()
      expect(type).toMatch(/^(memory|nextjs)$/)
    })

    it('should recommend memory cache in node environment', () => {
      const type = CacheManager.detectCacheType()
      expect(type).toBe('memory')
    })
  })

  describe('environmentInfo', () => {
    it('should provide environment information', () => {
      const info = CacheManager.environmentInfo()

      expect(info).toHaveProperty('environment')
      expect(info).toHaveProperty('recommendedCacheType')
      expect(info).toHaveProperty('features')

      expect(info.features).toHaveProperty('hasNextJS')
      expect(info.features).toHaveProperty('hasProcess')
      expect(info.features).toHaveProperty('hasWindow')
      expect(info.features).toHaveProperty('hasEdgeRuntime')
    })

    it('should correctly detect process in node environment', () => {
      const info = CacheManager.environmentInfo()
      expect(info.features.hasProcess).toBe(true)
      expect(info.features.hasWindow).toBe(false)
    })
  })
})
