/**
 * Document type tests
 *
 * Tests for core document types, type guards, and interfaces
 */

import { describe, it, expect } from 'vitest'
import {
  isDocumentReference,
  isResolvedReference,
  type BaseDocument,
  type DocumentReference,
  type ResolvedReference,
  type Slug,
  type Geopoint,
} from '../document'

describe('Document Types', () => {
  describe('BaseDocument', () => {
    it('should have required fields', () => {
      const doc: BaseDocument = {
        _id: 'test-123',
        _type: 'post',
      }

      expect(doc._id).toBe('test-123')
      expect(doc._type).toBe('post')
    })

    it('should support optional timestamp fields', () => {
      const doc: BaseDocument = {
        _id: 'test-123',
        _type: 'post',
        _createdAt: '2024-01-01T00:00:00Z',
        _updatedAt: '2024-01-01T00:00:00Z',
        _rev: 'rev-1',
      }

      expect(doc._createdAt).toBeDefined()
      expect(doc._updatedAt).toBeDefined()
      expect(doc._rev).toBeDefined()
    })
  })

  describe('DocumentReference', () => {
    it('should create a valid reference', () => {
      const ref: DocumentReference = {
        _ref: 'author-123',
        _type: 'reference',
      }

      expect(ref._ref).toBe('author-123')
      expect(ref._type).toBe('reference')
    })

    it('should support target type hint', () => {
      const ref: DocumentReference<'author'> = {
        _ref: 'author-123',
        _type: 'reference',
        _targetType: 'author',
      }

      expect(ref._targetType).toBe('author')
    })

    it('should support weak references', () => {
      const ref: DocumentReference = {
        _ref: 'author-123',
        _type: 'reference',
        _weak: true,
      }

      expect(ref._weak).toBe(true)
    })
  })

  describe('isDocumentReference', () => {
    it('should return true for valid reference', () => {
      const ref = {
        _ref: 'test-123',
        _type: 'reference',
      }

      expect(isDocumentReference(ref)).toBe(true)
    })

    it('should return false for non-reference objects', () => {
      expect(isDocumentReference({ _ref: 'test-123' })).toBe(false)
      expect(isDocumentReference({ _type: 'reference' })).toBe(false)
      expect(isDocumentReference({ _ref: 'test-123', _type: 'post' })).toBe(false)
    })

    it('should return false for primitives', () => {
      expect(isDocumentReference(null)).toBe(false)
      expect(isDocumentReference(undefined)).toBe(false)
      expect(isDocumentReference('string')).toBe(false)
      expect(isDocumentReference(123)).toBe(false)
    })
  })

  describe('ResolvedReference', () => {
    it('should contain both reference and resolved data', () => {
      const resolved: ResolvedReference = {
        _ref: 'author-123',
        _resolved: {
          _id: 'author-123',
          _type: 'author',
          name: 'John Doe',
        } as BaseDocument & { name: string },
      }

      expect(resolved._ref).toBe('author-123')
      expect(resolved._resolved._id).toBe('author-123')
      expect(resolved._resolved._type).toBe('author')
    })
  })

  describe('isResolvedReference', () => {
    it('should return true for resolved reference', () => {
      const resolved = {
        _ref: 'author-123',
        _resolved: {
          _id: 'author-123',
          _type: 'author',
        },
      }

      expect(isResolvedReference(resolved)).toBe(true)
    })

    it('should return false for unresolved reference', () => {
      const ref = {
        _ref: 'author-123',
        _type: 'reference',
      }

      expect(isResolvedReference(ref)).toBe(false)
    })

    it('should return false for non-reference objects', () => {
      expect(isResolvedReference({ _ref: 'test-123' })).toBe(false)
      expect(isResolvedReference({ _resolved: {} })).toBe(false)
      expect(isResolvedReference(null)).toBe(false)
    })
  })

  describe('Slug', () => {
    it('should have type and current fields', () => {
      const slug: Slug = {
        _type: 'slug',
        current: 'hello-world',
      }

      expect(slug._type).toBe('slug')
      expect(slug.current).toBe('hello-world')
    })

    it('should support URL-safe characters', () => {
      const slug: Slug = {
        _type: 'slug',
        current: 'hello-world-123',
      }

      expect(slug.current).toMatch(/^[a-z0-9-]+$/)
    })
  })

  describe('Geopoint', () => {
    it('should have latitude and longitude', () => {
      const point: Geopoint = {
        _type: 'geopoint',
        lat: 40.7128,
        lng: -74.006,
      }

      expect(point.lat).toBe(40.7128)
      expect(point.lng).toBe(-74.006)
    })

    it('should support optional altitude', () => {
      const point: Geopoint = {
        _type: 'geopoint',
        lat: 40.7128,
        lng: -74.006,
        alt: 10,
      }

      expect(point.alt).toBe(10)
    })

    it('should validate coordinate ranges', () => {
      const point: Geopoint = {
        _type: 'geopoint',
        lat: 40.7128,
        lng: -74.006,
      }

      expect(point.lat).toBeGreaterThanOrEqual(-90)
      expect(point.lat).toBeLessThanOrEqual(90)
      expect(point.lng).toBeGreaterThanOrEqual(-180)
      expect(point.lng).toBeLessThanOrEqual(180)
    })
  })

  describe('LocalizedField', () => {
    it('should support multiple locales', () => {
      type LocalizedString = {
        [locale: string]: string
      }

      const title: LocalizedString = {
        en: 'Hello World',
        es: 'Hola Mundo',
        fr: 'Bonjour le monde',
      }

      expect(title.en).toBe('Hello World')
      expect(title.es).toBe('Hola Mundo')
      expect(title.fr).toBe('Bonjour le monde')
    })
  })

  describe('DocumentSchema', () => {
    it('should define schema structure', () => {
      const schema = {
        name: 'post',
        type: 'document' as const,
        title: 'Blog Post',
        fields: [
          {
            name: 'title',
            type: 'string' as const,
            validation: [
              {
                type: 'required' as const,
                message: 'Title is required',
              },
            ],
          },
          {
            name: 'slug',
            type: 'slug' as const,
            options: {
              source: 'title',
              maxLength: 96,
            },
          },
        ],
      }

      expect(schema.name).toBe('post')
      expect(schema.type).toBe('document')
      expect(schema.fields).toHaveLength(2)
      expect(schema.fields[0].name).toBe('title')
      expect(schema.fields[0].type).toBe('string')
    })
  })
})
