/**
 * Error handling tests
 *
 * Tests for custom error classes and error utilities
 */

import { describe, it, expect } from 'vitest'
import {
  ContentBridgeError,
  QueryError,
  MutationError,
  DataValidationError,
  AdapterError,
  CacheError,
  isContentBridgeError,
  isErrorType,
  wrapError,
} from '../errors'

describe('Error Classes', () => {
  describe('ContentBridgeError', () => {
    it('should create error with message', () => {
      const error = new ContentBridgeError('Test error')

      expect(error.message).toBe('Test error')
      expect(error.name).toBe('ContentBridgeError')
    })

    it('should include error code', () => {
      const error = new ContentBridgeError('Test error', {
        code: 'TEST_ERROR',
      })

      expect(error.code).toBe('TEST_ERROR')
    })

    it('should include context', () => {
      const error = new ContentBridgeError('Test error', {
        context: { field: 'title', value: 'test' },
      })

      expect(error.context).toEqual({ field: 'title', value: 'test' })
    })

    it('should include cause', () => {
      const cause = new Error('Original error')
      const error = new ContentBridgeError('Test error', { cause })

      expect(error.cause).toBe(cause)
    })

    it('should convert to JSON', () => {
      const error = new ContentBridgeError('Test error', {
        code: 'TEST_ERROR',
        context: { field: 'title' },
      })

      const json = error.toJSON()

      expect(json.name).toBe('ContentBridgeError')
      expect(json.message).toBe('Test error')
      expect(json.code).toBe('TEST_ERROR')
      expect(json.context).toEqual({ field: 'title' })
    })

    it('should preserve stack trace', () => {
      const error = new ContentBridgeError('Test error')

      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('ContentBridgeError')
    })
  })

  describe('QueryError', () => {
    it('should create query error', () => {
      const error = new QueryError('Query failed')

      expect(error.name).toBe('QueryError')
      expect(error.message).toBe('Query failed')
    })

    it('should extend ContentBridgeError', () => {
      const error = new QueryError('Query failed')

      expect(error instanceof ContentBridgeError).toBe(true)
      expect(error instanceof QueryError).toBe(true)
    })
  })

  describe('MutationError', () => {
    it('should create mutation error', () => {
      const error = new MutationError('Mutation failed')

      expect(error.name).toBe('MutationError')
      expect(error.message).toBe('Mutation failed')
    })

    it('should include context', () => {
      const error = new MutationError('Create failed', {
        context: { type: 'post', data: { title: 'Test' } },
      })

      expect(error.context?.type).toBe('post')
    })
  })

  describe('DataValidationError', () => {
    it('should create validation error', () => {
      const error = new DataValidationError('Validation failed')

      expect(error.name).toBe('DataValidationError')
      expect(error.message).toBe('Validation failed')
    })

    it('should include validation errors', () => {
      const error = new DataValidationError('Validation failed', {
        errors: [
          {
            field: 'title',
            message: 'Title is required',
            code: 'REQUIRED',
          },
          {
            field: 'slug',
            message: 'Slug must be unique',
            code: 'UNIQUE',
          },
        ],
      })

      expect(error.errors).toHaveLength(2)
      expect(error.errors?.[0].field).toBe('title')
      expect(error.errors?.[1].field).toBe('slug')
    })

    it('should convert to JSON with errors', () => {
      const error = new DataValidationError('Validation failed', {
        errors: [{ field: 'title', message: 'Required' }],
      })

      const json = error.toJSON()
      expect(json.errors).toBeDefined()
      expect(Array.isArray(json.errors)).toBe(true)
    })
  })

  describe('AdapterError', () => {
    it('should create adapter error', () => {
      const error = new AdapterError('Adapter failed')

      expect(error.name).toBe('AdapterError')
      expect(error.message).toBe('Adapter failed')
    })

    it('should include adapter name', () => {
      const error = new AdapterError('Connection failed', {
        adapter: 'sanity',
      })

      expect(error.adapter).toBe('sanity')
    })

    it('should convert to JSON with adapter', () => {
      const error = new AdapterError('Failed', { adapter: 'contentful' })

      const json = error.toJSON()
      expect(json.adapter).toBe('contentful')
    })
  })

  describe('CacheError', () => {
    it('should create cache error', () => {
      const error = new CacheError('Cache failed')

      expect(error.name).toBe('CacheError')
      expect(error.message).toBe('Cache failed')
    })

    it('should include operation', () => {
      const error = new CacheError('Invalidation failed', {
        operation: 'invalidate',
      })

      expect(error.operation).toBe('invalidate')
    })

    it('should convert to JSON with operation', () => {
      const error = new CacheError('Failed', { operation: 'set' })

      const json = error.toJSON()
      expect(json.operation).toBe('set')
    })
  })
})

describe('Error Utilities', () => {
  describe('isContentBridgeError', () => {
    it('should return true for ContentBridge errors', () => {
      const error = new ContentBridgeError('Test')
      expect(isContentBridgeError(error)).toBe(true)
    })

    it('should return true for subclass errors', () => {
      const error = new QueryError('Test')
      expect(isContentBridgeError(error)).toBe(true)
    })

    it('should return false for native errors', () => {
      const error = new Error('Test')
      expect(isContentBridgeError(error)).toBe(false)
    })

    it('should return false for non-errors', () => {
      expect(isContentBridgeError('string')).toBe(false)
      expect(isContentBridgeError(null)).toBe(false)
      expect(isContentBridgeError({})).toBe(false)
    })
  })

  describe('isErrorType', () => {
    it('should check specific error type', () => {
      const error = new QueryError('Test')

      expect(isErrorType(error, QueryError)).toBe(true)
      expect(isErrorType(error, MutationError)).toBe(false)
    })

    it('should work with base class', () => {
      const error = new ContentBridgeError('Test')

      expect(isErrorType(error, ContentBridgeError)).toBe(true)
    })
  })

  describe('wrapError', () => {
    it('should wrap native error', () => {
      const native = new Error('Original error')
      const wrapped = wrapError(native)

      expect(wrapped instanceof ContentBridgeError).toBe(true)
      expect(wrapped.cause).toBe(native)
      expect(wrapped.message).toBe('Original error')
    })

    it('should use custom message', () => {
      const native = new Error('Original')
      const wrapped = wrapError(native, 'Custom message')

      expect(wrapped.message).toBe('Custom message')
    })

    it('should include code and context', () => {
      const native = new Error('Original')
      const wrapped = wrapError(native, 'Wrapped', {
        code: 'WRAPPED',
        context: { field: 'test' },
      })

      expect(wrapped.code).toBe('WRAPPED')
      expect(wrapped.context).toEqual({ field: 'test' })
    })

    it('should return ContentBridge error as-is', () => {
      const original = new QueryError('Test')
      const wrapped = wrapError(original)

      expect(wrapped).toBe(original)
    })

    it('should handle non-Error values', () => {
      const wrapped = wrapError('string error')

      expect(wrapped instanceof ContentBridgeError).toBe(true)
      expect(wrapped.message).toBe('Unknown error occurred')
    })
  })
})
