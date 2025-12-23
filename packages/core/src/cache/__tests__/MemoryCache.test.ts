/**
 * Unit tests for MemoryCache
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryCache } from '../strategies/MemoryCache'

describe('MemoryCache', () => {
  let cache: MemoryCache

  beforeEach(() => {
    cache = new MemoryCache({ maxSize: 3 })
  })

  describe('get/set', () => {
    it('should set and get a value', async () => {
      await cache.set('key1', { data: 'value1' })
      const result = await cache.get<{ data: string }>('key1')
      expect(result).toEqual({ data: 'value1' })
    })

    it('should return null for non-existent key', async () => {
      const result = await cache.get('nonexistent')
      expect(result).toBeNull()
    })

    it('should overwrite existing value', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key1', 'value2')
      const result = await cache.get('key1')
      expect(result).toBe('value2')
    })
  })

  describe('TTL', () => {
    it('should expire value after TTL', async () => {
      vi.useFakeTimers()

      await cache.set('key1', 'value1', { ttl: 1 }) // 1 second TTL

      // Value should be available immediately
      let result = await cache.get('key1')
      expect(result).toBe('value1')

      // Fast forward 1.5 seconds
      vi.advanceTimersByTime(1500)

      // Value should be expired
      result = await cache.get('key1')
      expect(result).toBeNull()

      vi.useRealTimers()
    })

    it('should use default TTL when provided in constructor', async () => {
      vi.useFakeTimers()

      const cacheWithTTL = new MemoryCache({ defaultTtl: 2 })
      await cacheWithTTL.set('key1', 'value1')

      // Value should be available immediately
      let result = await cacheWithTTL.get('key1')
      expect(result).toBe('value1')

      // Fast forward 2.5 seconds
      vi.advanceTimersByTime(2500)

      // Value should be expired
      result = await cacheWithTTL.get('key1')
      expect(result).toBeNull()

      vi.useRealTimers()
    })
  })

  describe('LRU eviction', () => {
    it('should evict least recently used when maxSize is reached', async () => {
      // Set 3 values (max size)
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')
      await cache.set('key3', 'value3')

      // All should be present
      expect(await cache.get('key1')).toBe('value1')
      expect(await cache.get('key2')).toBe('value2')
      expect(await cache.get('key3')).toBe('value3')

      // Add a 4th value - should evict key1 (least recently used)
      await cache.set('key4', 'value4')

      expect(await cache.get('key1')).toBeNull()
      expect(await cache.get('key2')).toBe('value2')
      expect(await cache.get('key3')).toBe('value3')
      expect(await cache.get('key4')).toBe('value4')
    })

    it('should update access order on get', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')
      await cache.set('key3', 'value3')

      // Access key1 to make it most recently used
      await cache.get('key1')

      // Add key4 - should evict key2 now
      await cache.set('key4', 'value4')

      expect(await cache.get('key1')).toBe('value1')
      expect(await cache.get('key2')).toBeNull()
      expect(await cache.get('key3')).toBe('value3')
      expect(await cache.get('key4')).toBe('value4')
    })
  })

  describe('tag-based invalidation', () => {
    it('should invalidate entries by tag', async () => {
      await cache.set('user1', { id: 1 }, { tags: ['user', 'profile'] })
      await cache.set('user2', { id: 2 }, { tags: ['user'] })
      await cache.set('post1', { id: 1 }, { tags: ['post'] })

      // Invalidate all entries with 'user' tag
      await cache.invalidateByTags(['user'])

      expect(await cache.get('user1')).toBeNull()
      expect(await cache.get('user2')).toBeNull()
      expect(await cache.get('post1')).toEqual({ id: 1 })
    })

    it('should invalidate entries with multiple tags', async () => {
      await cache.set('key1', 'value1', { tags: ['tag1', 'tag2'] })
      await cache.set('key2', 'value2', { tags: ['tag2', 'tag3'] })
      await cache.set('key3', 'value3', { tags: ['tag3'] })

      await cache.invalidateByTags(['tag2'])

      expect(await cache.get('key1')).toBeNull()
      expect(await cache.get('key2')).toBeNull()
      expect(await cache.get('key3')).toBe('value3')
    })
  })

  describe('delete', () => {
    it('should delete a specific entry', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')

      await cache.delete('key1')

      expect(await cache.get('key1')).toBeNull()
      expect(await cache.get('key2')).toBe('value2')
    })

    it('should remove tags when deleting entry', async () => {
      await cache.set('key1', 'value1', { tags: ['tag1'] })
      await cache.delete('key1')

      // Stats should show no tags
      expect(cache.stats().tagCount).toBe(0)
    })
  })

  describe('clear', () => {
    it('should clear all entries', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')
      await cache.set('key3', 'value3')

      await cache.clear()

      expect(await cache.get('key1')).toBeNull()
      expect(await cache.get('key2')).toBeNull()
      expect(await cache.get('key3')).toBeNull()
      expect(cache.size()).toBe(0)
    })
  })

  describe('stats', () => {
    it('should provide accurate statistics', async () => {
      await cache.set('key1', 'value1', { tags: ['tag1'] })
      await cache.set('key2', 'value2', { tags: ['tag2'] })

      const stats = cache.stats()
      expect(stats.size).toBe(2)
      expect(stats.maxSize).toBe(3)
      expect(stats.tagCount).toBe(2)
    })
  })
})
