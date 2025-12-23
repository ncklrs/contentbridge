/**
 * MutationBuilder tests
 *
 * Tests for the fluent mutation builder API
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MutationBuilder } from '../MutationBuilder'
import { MockMutationExecutor, createTestPost } from '../../test-utils'
import type { Post } from '../../test-utils/fixtures'

describe('MutationBuilder', () => {
  let executor: MockMutationExecutor<Post>
  let builder: MutationBuilder<Post>

  beforeEach(() => {
    executor = new MockMutationExecutor()
    builder = new MutationBuilder(executor)
  })

  describe('create operations', () => {
    it('should add a create operation', () => {
      builder.create({
        _type: 'post',
        title: 'New Post',
        slug: { _type: 'slug', current: 'new-post' },
        content: [],
        featured: false,
        views: 0,
        tags: [],
        status: 'draft',
      })

      const ops = builder.toOperations()
      expect(ops).toHaveLength(1)
      expect(ops[0].type).toBe('create')
    })

    it('should add create with custom ID', () => {
      builder.create({
        _type: 'post',
        title: 'New Post',
        slug: { _type: 'slug', current: 'new-post' },
        content: [],
        featured: false,
        views: 0,
        tags: [],
        status: 'draft',
      }, 'custom-id')

      const ops = builder.toOperations()
      expect(ops[0]).toHaveProperty('id', 'custom-id')
    })

    it('should add multiple creates with createMany', () => {
      builder.createMany([
        createTestPost({ title: 'Post 1' }),
        createTestPost({ title: 'Post 2' }),
      ])

      const ops = builder.toOperations()
      expect(ops).toHaveLength(2)
      expect(ops.every((op) => op.type === 'create')).toBe(true)
    })
  })

  describe('update operations', () => {
    it('should add an update operation', () => {
      builder.update('post-123', {
        _id: 'post-123',
        _type: 'post',
        title: 'Updated Title',
      })

      const ops = builder.toOperations()
      expect(ops).toHaveLength(1)
      expect(ops[0].type).toBe('update')
      expect((ops[0] as { id: string }).id).toBe('post-123')
    })

    it('should support optimistic locking', () => {
      builder.update(
        'post-123',
        {
          _id: 'post-123',
          _type: 'post',
          title: 'Updated',
        },
        'rev-abc'
      )

      const ops = builder.toOperations()
      expect(ops[0]).toHaveProperty('ifRevision', 'rev-abc')
    })

    it('should add multiple updates with updateMany', () => {
      builder.updateMany([
        { id: 'post-1', document: { _id: 'post-1', _type: 'post', title: 'Updated 1' } },
        { id: 'post-2', document: { _id: 'post-2', _type: 'post', title: 'Updated 2' } },
      ])

      const ops = builder.toOperations()
      expect(ops).toHaveLength(2)
      expect(ops.every((op) => op.type === 'update')).toBe(true)
    })
  })

  describe('patch operations', () => {
    it('should add a patch operation', () => {
      builder.patch('post-123', [
        { op: 'set', path: 'title', value: 'Patched' },
      ])

      const ops = builder.toOperations()
      expect(ops).toHaveLength(1)
      expect(ops[0].type).toBe('patch')
    })

    it('should support multiple patch operations', () => {
      builder.patch('post-123', [
        { op: 'set', path: 'title', value: 'Patched' },
        { op: 'inc', path: 'views', value: 1 },
        { op: 'unset', path: 'draft' },
      ])

      const ops = builder.toOperations()
      expect(ops[0]).toHaveProperty('operations')
      expect((ops[0] as { operations: unknown[] }).operations).toHaveLength(3)
    })

    it('should add multiple patches with patchMany', () => {
      builder.patchMany([
        { id: 'post-1', operations: [{ op: 'inc', path: 'views', value: 1 }] },
        { id: 'post-2', operations: [{ op: 'inc', path: 'views', value: 1 }] },
      ])

      const ops = builder.toOperations()
      expect(ops).toHaveLength(2)
      expect(ops.every((op) => op.type === 'patch')).toBe(true)
    })
  })

  describe('delete operations', () => {
    it('should add a delete operation', () => {
      builder.delete('post-123')

      const ops = builder.toOperations()
      expect(ops).toHaveLength(1)
      expect(ops[0].type).toBe('delete')
      expect((ops[0] as { id: string }).id).toBe('post-123')
    })

    it('should add multiple deletes with deleteMany', () => {
      builder.deleteMany(['post-1', 'post-2', 'post-3'])

      const ops = builder.toOperations()
      expect(ops).toHaveLength(3)
      expect(ops.every((op) => op.type === 'delete')).toBe(true)
    })
  })

  describe('patch helper methods', () => {
    it('should use set helper', () => {
      builder.set('post-123', 'title', 'New Title')

      const ops = builder.toOperations()
      expect(ops[0].type).toBe('patch')
    })

    it('should use unset helper', () => {
      builder.unset('post-123', 'draft')

      const ops = builder.toOperations()
      expect(ops[0].type).toBe('patch')
    })

    it('should use increment helper', () => {
      builder.increment('post-123', 'views', 5)

      const ops = builder.toOperations()
      expect(ops[0].type).toBe('patch')
    })

    it('should use decrement helper', () => {
      builder.decrement('post-123', 'stock', 1)

      const ops = builder.toOperations()
      expect(ops[0].type).toBe('patch')
    })

    it('should use setIfMissing helper', () => {
      builder.setIfMissing('post-123', 'createdBy', 'user-456')

      const ops = builder.toOperations()
      expect(ops[0].type).toBe('patch')
    })

    it('should use append helper', () => {
      builder.append('post-123', 'tags', 'featured')

      const ops = builder.toOperations()
      expect(ops[0].type).toBe('patch')
    })

    it('should use prepend helper', () => {
      builder.prepend('post-123', 'tags', 'breaking')

      const ops = builder.toOperations()
      expect(ops[0].type).toBe('patch')
    })

    it('should use insertAt helper', () => {
      builder.insertAt('post-123', 'tags', 2, 'important')

      const ops = builder.toOperations()
      expect(ops[0].type).toBe('patch')
    })
  })

  describe('options', () => {
    it('should set mutation options', () => {
      builder.withOptions({
        autoPublish: true,
        invalidateTags: ['posts'],
      })

      expect(builder).toBeDefined()
    })

    it('should skip validation', () => {
      builder.skipValidation()
      expect(builder).toBeDefined()
    })

    it('should auto-publish', () => {
      builder.autoPublish()
      expect(builder).toBeDefined()
    })

    it('should invalidate tags', () => {
      builder.invalidateTags('posts', 'featured')
      expect(builder).toBeDefined()
    })
  })

  describe('execution', () => {
    it('should commit operations', async () => {
      executor.setResult({
        results: [
          {
            operation: { type: 'create', document: { _type: 'post' } },
            result: null,
          },
        ],
      })

      await builder.create(createTestPost()).commit()

      expect(executor.lastOperations).toHaveLength(1)
      expect(executor.lastOptions).toBeDefined()
    })

    it('should throw error when no operations', async () => {
      await expect(builder.commit()).rejects.toThrow('No operations to commit')
    })

    it('should get operations without executing', () => {
      builder.create(createTestPost()).delete('post-2')

      const ops = builder.toOperations()
      expect(ops).toHaveLength(2)
      expect(executor.lastOperations).toBeNull()
    })

    it('should clear operations', () => {
      builder.create(createTestPost()).delete('post-2')
      expect(builder.count()).toBe(2)

      builder.clear()
      expect(builder.count()).toBe(0)
    })

    it('should count operations', () => {
      builder.create(createTestPost()).delete('post-2')
      expect(builder.count()).toBe(2)
    })
  })

  describe('chaining', () => {
    it('should support method chaining', () => {
      builder
        .create(createTestPost())
        .update('post-2', { _id: 'post-2', _type: 'post', title: 'Updated' })
        .patch('post-3', [{ op: 'inc', path: 'views', value: 1 }])
        .delete('post-4')

      const ops = builder.toOperations()
      expect(ops).toHaveLength(4)
    })

    it('should support complex chaining with helpers', () => {
      builder
        .create(createTestPost())
        .set('post-2', 'title', 'New Title')
        .increment('post-3', 'views', 1)
        .append('post-4', 'tags', 'featured')
        .delete('post-5')
        .autoPublish()
        .invalidateTags('posts')

      const ops = builder.toOperations()
      expect(ops).toHaveLength(5)
    })
  })

  describe('cloning', () => {
    it('should clone builder with operations', () => {
      const original = builder.create(createTestPost())

      const cloned = original.clone()
      cloned.delete('post-2')

      expect(original.count()).toBe(1)
      expect(cloned.count()).toBe(2)
    })

    it('should clone with options', () => {
      const original = builder.autoPublish().invalidateTags('posts')

      const cloned = original.clone()
      expect(cloned).toBeDefined()
    })
  })
})
