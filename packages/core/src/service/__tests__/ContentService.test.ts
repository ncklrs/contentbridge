/**
 * ContentService tests
 *
 * Tests for the core ContentService interface implementation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MockContentService, createTestPost, createTestAuthor, samplePost } from '../../test-utils'
import type { Post, Author } from '../../test-utils/fixtures'

describe('ContentService', () => {
  let service: MockContentService<Post | Author>

  beforeEach(() => {
    service = new MockContentService()
    service.reset()
  })

  describe('getById', () => {
    it('should get document by ID', async () => {
      service.seed([samplePost])

      const result = await service.getById('post-456')

      expect(result).toBeDefined()
      expect(result?._id).toBe('post-456')
      expect(result?._type).toBe('post')
    })

    it('should return null for non-existent ID', async () => {
      const result = await service.getById('non-existent')

      expect(result).toBeNull()
    })

    it('should track method call', async () => {
      await service.getById('test-id')

      expect(service.getCallCount('getById')).toBe(1)
      expect(service.getLastCall('getById')).toEqual(['test-id', undefined])
    })
  })

  describe('getBySlug', () => {
    it('should get document by slug', async () => {
      service.seed([samplePost])

      const result = await service.getBySlug<Post>('hello-world', 'post')

      expect(result).toBeDefined()
      expect(result?._type).toBe('post')
      expect(result?.slug.current).toBe('hello-world')
    })

    it('should return null for non-existent slug', async () => {
      const result = await service.getBySlug('non-existent', 'post')

      expect(result).toBeNull()
    })

    it('should match both slug and type', async () => {
      service.seed([samplePost])

      const wrongType = await service.getBySlug('hello-world', 'author')
      expect(wrongType).toBeNull()

      const correct = await service.getBySlug('hello-world', 'post')
      expect(correct).toBeDefined()
    })
  })

  describe('getMany', () => {
    it('should get multiple documents by IDs', async () => {
      const posts = [
        createTestPost({ _id: 'post-1' }),
        createTestPost({ _id: 'post-2' }),
        createTestPost({ _id: 'post-3' }),
      ]
      service.seed(posts)

      const result = await service.getMany(['post-1', 'post-2'])

      expect(result).toHaveLength(2)
      expect(result[0]._id).toBe('post-1')
      expect(result[1]._id).toBe('post-2')
    })

    it('should filter out non-existent IDs', async () => {
      const posts = [createTestPost({ _id: 'post-1' })]
      service.seed(posts)

      const result = await service.getMany(['post-1', 'non-existent'])

      expect(result).toHaveLength(1)
      expect(result[0]._id).toBe('post-1')
    })

    it('should return empty array for empty input', async () => {
      const result = await service.getMany([])

      expect(result).toEqual([])
    })
  })

  describe('getOne', () => {
    it('should get one document matching query', async () => {
      service.seed([samplePost])

      const result = await service.getOne({
        type: 'post',
        filter: [{ field: 'status', operator: '==', value: 'published' }],
      })

      expect(result).toBeDefined()
      expect(result?._type).toBe('post')
    })

    it('should return null when no matches', async () => {
      const result = await service.getOne({
        type: 'post',
        filter: [{ field: 'status', operator: '==', value: 'published' }],
      })

      expect(result).toBeNull()
    })
  })

  describe('count', () => {
    it('should count documents matching query', async () => {
      service.seed([
        createTestPost({ _id: 'post-1' }),
        createTestPost({ _id: 'post-2' }),
        createTestPost({ _id: 'post-3' }),
      ])

      const count = await service.count({ type: 'post' })

      expect(count).toBe(3)
    })
  })

  describe('exists', () => {
    it('should return true for existing document', async () => {
      service.seed([samplePost])

      const exists = await service.exists('post-456')

      expect(exists).toBe(true)
    })

    it('should return false for non-existent document', async () => {
      const exists = await service.exists('non-existent')

      expect(exists).toBe(false)
    })
  })

  describe('create', () => {
    it('should create a new document', async () => {
      const newPost = await service.create<Post>({
        _type: 'post',
        title: 'New Post',
        slug: { _type: 'slug', current: 'new-post' },
        content: [],
        featured: false,
        views: 0,
        tags: [],
        status: 'draft',
      })

      expect(newPost._id).toBeDefined()
      expect(newPost._type).toBe('post')
      expect(newPost.title).toBe('New Post')
      expect(newPost._createdAt).toBeDefined()
      expect(newPost._updatedAt).toBeDefined()
    })

    it('should generate unique IDs', async () => {
      const post1 = await service.create<Post>({
        _type: 'post',
        title: 'Post 1',
        slug: { _type: 'slug', current: 'post-1' },
        content: [],
        featured: false,
        views: 0,
        tags: [],
        status: 'draft',
      })

      const post2 = await service.create<Post>({
        _type: 'post',
        title: 'Post 2',
        slug: { _type: 'slug', current: 'post-2' },
        content: [],
        featured: false,
        views: 0,
        tags: [],
        status: 'draft',
      })

      expect(post1._id).not.toBe(post2._id)
    })

    it('should add document to storage', async () => {
      const newPost = await service.create<Post>({
        _type: 'post',
        title: 'New Post',
        slug: { _type: 'slug', current: 'new-post' },
        content: [],
        featured: false,
        views: 0,
        tags: [],
        status: 'draft',
      })

      const retrieved = await service.getById(newPost._id)
      expect(retrieved).toEqual(newPost)
    })
  })

  describe('update', () => {
    it('should update an existing document', async () => {
      service.seed([samplePost])

      const updated = await service.update<Post>('post-456', {
        _id: 'post-456',
        _type: 'post',
        title: 'Updated Title',
      })

      expect(updated.title).toBe('Updated Title')
      expect(updated._updatedAt).toBeDefined()
    })

    it('should throw error for non-existent document', async () => {
      await expect(
        service.update('non-existent', {
          _id: 'non-existent',
          _type: 'post',
        })
      ).rejects.toThrow('Document non-existent not found')
    })

    it('should preserve other fields', async () => {
      service.seed([samplePost])

      const updated = await service.update<Post>('post-456', {
        _id: 'post-456',
        _type: 'post',
        title: 'Updated Title',
      })

      expect(updated.slug).toEqual(samplePost.slug)
      expect(updated.status).toBe(samplePost.status)
    })
  })

  describe('patch', () => {
    it('should patch a document', async () => {
      service.seed([samplePost])

      const patched = await service.patch<Post>('post-456', [
        { op: 'set', path: 'title', value: 'Patched Title' },
      ])

      expect(patched._id).toBe('post-456')
      expect(patched._updatedAt).toBeDefined()
    })

    it('should throw error for non-existent document', async () => {
      await expect(
        service.patch('non-existent', [{ op: 'set', path: 'title', value: 'New' }])
      ).rejects.toThrow('Document non-existent not found')
    })
  })

  describe('delete', () => {
    it('should delete a document', async () => {
      service.seed([samplePost])

      await service.delete('post-456')

      const exists = await service.exists('post-456')
      expect(exists).toBe(false)
    })

    it('should not throw for non-existent document', async () => {
      await expect(service.delete('non-existent')).resolves.not.toThrow()
    })
  })

  describe('transaction', () => {
    it('should execute multiple operations', async () => {
      const result = await service.transaction([
        {
          type: 'create',
          document: {
            _type: 'post',
            title: 'Post 1',
            slug: { _type: 'slug', current: 'post-1' },
            content: [],
            featured: false,
            views: 0,
            tags: [],
            status: 'draft',
          },
        },
        {
          type: 'create',
          document: {
            _type: 'post',
            title: 'Post 2',
            slug: { _type: 'slug', current: 'post-2' },
            content: [],
            featured: false,
            views: 0,
            tags: [],
            status: 'draft',
          },
        },
      ])

      expect(result.results).toHaveLength(2)
    })

    it('should track transaction call', async () => {
      await service.transaction([])

      expect(service.getCallCount('transaction')).toBe(1)
    })
  })

  describe('validate', () => {
    it('should validate a document', async () => {
      const result = await service.validate({
        _type: 'post',
        title: 'Valid Post',
      })

      expect(result.valid).toBe(true)
    })
  })

  describe('invalidateCache', () => {
    it('should invalidate cache tags', async () => {
      await service.invalidateCache(['post-123', 'tag:posts'])

      expect(service.getCallCount('invalidateCache')).toBe(1)
      expect(service.getLastCall('invalidateCache')).toEqual([
        ['post-123', 'tag:posts'],
      ])
    })
  })

  describe('reference', () => {
    it('should create a document reference', () => {
      const ref = service.reference('author-123', 'author')

      expect(ref._ref).toBe('author-123')
      expect(ref._type).toBe('reference')
      expect(ref._targetType).toBe('author')
    })

    it('should support weak references', () => {
      const ref = service.reference('author-123', 'author', true)

      expect(ref._weak).toBe(true)
    })

    it('should work without target type', () => {
      const ref = service.reference('author-123')

      expect(ref._ref).toBe('author-123')
      expect(ref._type).toBe('reference')
      expect(ref._targetType).toBeUndefined()
    })
  })
})
