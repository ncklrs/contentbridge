/**
 * QueryBuilder tests
 *
 * Tests for the fluent query builder API
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { QueryBuilder, QueryExecutor } from '../QueryBuilder'
import type { BaseDocument, Slug } from '../../types/document'
import type { QueryConfig, QueryResult, SingleResult } from '../../types/query'

// Test document type
interface Post extends BaseDocument {
  _type: 'post'
  title: string
  slug: Slug
  content: string
  publishedAt: string
  views: number
  featured: boolean
  tags: string[]
  status: 'draft' | 'published' | 'archived'
}

// Mock executor
class MockExecutor implements QueryExecutor<Post> {
  lastConfig: QueryConfig<Post> | null = null

  async executeMany(config: QueryConfig<Post>): Promise<QueryResult<Post>> {
    this.lastConfig = config
    return {
      data: [],
      total: 0,
      hasMore: false,
    }
  }

  async executeOne(config: QueryConfig<Post>): Promise<SingleResult<Post>> {
    this.lastConfig = config
    return {
      data: null,
    }
  }

  async executeCount(config: QueryConfig): Promise<number> {
    this.lastConfig = config
    return 0
  }
}

describe('QueryBuilder', () => {
  let executor: MockExecutor
  let builder: QueryBuilder<Post>

  beforeEach(() => {
    executor = new MockExecutor()
    builder = new QueryBuilder<Post>('post', executor)
  })

  describe('filtering', () => {
    it('should add equality filter', () => {
      builder.where('status', '==', 'published')
      const query = builder.toQuery()

      expect(query.filter).toEqual([
        { field: 'status', operator: '==', value: 'published' }
      ])
    })

    it('should add multiple filters', () => {
      builder
        .where('status', '==', 'published')
        .where('featured', '==', true)

      const query = builder.toQuery()
      expect(query.filter).toHaveLength(2)
    })

    it('should support equals shorthand', () => {
      builder.equals('status', 'published')
      const query = builder.toQuery()

      expect(query.filter).toEqual([
        { field: 'status', operator: '==', value: 'published' }
      ])
    })

    it('should support notEquals shorthand', () => {
      builder.notEquals('status', 'draft')
      const query = builder.toQuery()

      expect(query.filter).toEqual([
        { field: 'status', operator: '!=', value: 'draft' }
      ])
    })

    it('should support in operator', () => {
      builder.in('status', ['published', 'featured'])
      const query = builder.toQuery()

      expect(query.filter).toEqual([
        { field: 'status', operator: 'in', value: ['published', 'featured'] }
      ])
    })

    it('should support contains operator', () => {
      builder.contains('tags', 'javascript')
      const query = builder.toQuery()

      expect(query.filter).toEqual([
        { field: 'tags', operator: 'contains', value: 'javascript' }
      ])
    })

    it('should support comparison operators', () => {
      builder.greaterThan('views', 1000)
      const query = builder.toQuery()

      expect(query.filter).toEqual([
        { field: 'views', operator: '>', value: 1000 }
      ])
    })

    it('should support OR conditions', () => {
      builder.or([
        { field: 'featured', operator: '==', value: true },
        { field: 'views', operator: '>', value: 10000 }
      ])

      const query = builder.toQuery()
      expect(query.filter?.[0]).toHaveProperty('or')
    })

    it('should support AND conditions', () => {
      builder.and([
        { field: 'status', operator: '==', value: 'published' },
        { field: 'featured', operator: '==', value: true }
      ])

      const query = builder.toQuery()
      expect(query.filter?.[0]).toHaveProperty('and')
    })

    it('should support NOT conditions', () => {
      builder.not({ field: 'status', operator: '==', value: 'draft' })

      const query = builder.toQuery()
      expect(query.filter?.[0]).toHaveProperty('not')
    })
  })

  describe('projection', () => {
    it('should select specific fields', () => {
      builder.select('title', 'slug', 'publishedAt')
      const query = builder.toQuery()

      expect(query.projection).toEqual({
        title: true,
        slug: true,
        publishedAt: true
      })
    })

    it('should support custom projection', () => {
      builder.project({
        title: true,
        slug: true
      })

      const query = builder.toQuery()
      expect(query.projection).toEqual({
        title: true,
        slug: true
      })
    })
  })

  describe('sorting', () => {
    it('should add orderBy', () => {
      builder.orderBy('publishedAt', 'desc')
      const query = builder.toQuery()

      expect(query.orderBy).toEqual([
        { field: 'publishedAt', direction: 'desc' }
      ])
    })

    it('should support multiple sorts', () => {
      builder
        .orderBy('featured', 'desc')
        .orderBy('publishedAt', 'desc')

      const query = builder.toQuery()
      expect(query.orderBy).toHaveLength(2)
    })

    it('should support sortAsc shorthand', () => {
      builder.sortAsc('title')
      const query = builder.toQuery()

      expect(query.orderBy).toEqual([
        { field: 'title', direction: 'asc' }
      ])
    })

    it('should support sortDesc shorthand', () => {
      builder.sortDesc('publishedAt')
      const query = builder.toQuery()

      expect(query.orderBy).toEqual([
        { field: 'publishedAt', direction: 'desc' }
      ])
    })
  })

  describe('pagination', () => {
    it('should set limit', () => {
      builder.limit(10)
      const query = builder.toQuery()

      expect(query.limit).toBe(10)
    })

    it('should set offset', () => {
      builder.offset(20)
      const query = builder.toQuery()

      expect(query.offset).toBe(20)
    })

    it('should calculate page/pageSize', () => {
      builder.page(2, 20)
      const query = builder.toQuery()

      expect(query.offset).toBe(20)
      expect(query.limit).toBe(20)
    })

    it('should set cursor', () => {
      builder.cursor('abc123')
      const query = builder.toQuery()

      expect(query.cursor).toBe('abc123')
    })
  })

  describe('localization', () => {
    it('should set locale', () => {
      builder.locale('es')
      const query = builder.toQuery()

      expect(query.locale).toBe('es')
    })

    it('should set locale with fallback', () => {
      builder.locale('es', 'en')
      const query = builder.toQuery()

      expect(query.locale).toBe('es')
      expect(query.fallbackLocale).toBe('en')
    })
  })

  describe('caching', () => {
    it('should set cache options', () => {
      builder.cache({ tags: ['posts'], ttl: 3600 })
      const query = builder.toQuery()

      expect(query.cache).toEqual({
        tags: ['posts'],
        ttl: 3600
      })
    })

    it('should add cache tags', () => {
      builder.tags('posts', 'featured')
      const query = builder.toQuery()

      expect(query.cache?.tags).toEqual(['posts', 'featured'])
    })

    it('should set TTL', () => {
      builder.ttl(3600)
      const query = builder.toQuery()

      expect(query.cache?.ttl).toBe(3600)
    })

    it('should disable cache', () => {
      builder.noCache()
      const query = builder.toQuery()

      expect(query.cache?.noCache).toBe(true)
    })

    it('should set revalidate', () => {
      builder.revalidate(60)
      const query = builder.toQuery()

      expect(query.cache?.revalidate).toBe(60)
    })
  })

  describe('drafts and references', () => {
    it('should include drafts', () => {
      builder.includeDrafts()
      const query = builder.toQuery()

      expect(query.includeDrafts).toBe(true)
    })

    it('should resolve references', () => {
      builder.resolveReferences(2)
      const query = builder.toQuery()

      expect(query.resolveReferences).toBe(2)
    })
  })

  describe('execution', () => {
    it('should execute getMany', async () => {
      await builder.getMany()

      expect(executor.lastConfig).toBeDefined()
      expect(executor.lastConfig?.type).toBe('post')
    })

    it('should execute getOne', async () => {
      await builder.getOne()

      expect(executor.lastConfig).toBeDefined()
      expect(executor.lastConfig?.type).toBe('post')
    })

    it('should execute count', async () => {
      await builder.count()

      expect(executor.lastConfig).toBeDefined()
      expect(executor.lastConfig?.type).toBe('post')
    })
  })

  describe('chaining', () => {
    it('should support method chaining', () => {
      const query = builder
        .where('status', '==', 'published')
        .where('featured', '==', true)
        .orderBy('publishedAt', 'desc')
        .limit(10)
        .offset(0)
        .tags('posts')
        .toQuery()

      expect(query.filter).toHaveLength(2)
      expect(query.orderBy).toHaveLength(1)
      expect(query.limit).toBe(10)
      expect(query.offset).toBe(0)
      expect(query.cache?.tags).toEqual(['posts'])
    })

    it('should support complex chaining', async () => {
      await builder
        .where('status', '==', 'published')
        .greaterThan('views', 1000)
        .contains('tags', 'javascript')
        .locale('es', 'en')
        .select('title', 'slug', 'publishedAt')
        .sortDesc('publishedAt')
        .page(1, 20)
        .tags('posts', 'featured')
        .ttl(3600)
        .getMany()

      const config = executor.lastConfig!
      expect(config.filter).toHaveLength(3)
      expect(config.locale).toBe('es')
      expect(config.fallbackLocale).toBe('en')
      expect(config.projection).toBeDefined()
      expect(config.orderBy).toHaveLength(1)
      expect(config.limit).toBe(20)
      expect(config.cache?.tags).toEqual(['posts', 'featured'])
      expect(config.cache?.ttl).toBe(3600)
    })
  })

  describe('cloning', () => {
    it('should clone builder', () => {
      const original = builder
        .where('status', '==', 'published')
        .orderBy('publishedAt', 'desc')

      const cloned = original.clone()
      cloned.where('featured', '==', true)

      const originalQuery = original.toQuery()
      const clonedQuery = cloned.toQuery()

      expect(originalQuery.filter).toHaveLength(1)
      expect(clonedQuery.filter).toHaveLength(2)
    })
  })
})
