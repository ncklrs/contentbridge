/**
 * Unit tests for TypeGenerator
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { TypeGenerator, TypeGeneratorUtils } from '../typegen/TypeGenerator.js'
import type { DocumentSchema, FieldSchema } from '@contentbridge/core/types'
import type { BaseAdapter } from '@contentbridge/core/adapters'

describe('TypeGenerator', () => {
  let mockAdapter: BaseAdapter

  beforeEach(() => {
    mockAdapter = {
      name: 'test-adapter',
      version: '1.0.0',
      initialize: vi.fn().mockResolvedValue(undefined),
      cleanup: vi.fn().mockResolvedValue(undefined),
      getSchemas: vi.fn().mockResolvedValue([]),
      generateTypes: vi.fn().mockResolvedValue({
        imports: [],
        interfaces: '',
        schemas: null,
      }),
      generateZodSchemas: vi.fn().mockResolvedValue(''),
    } as any
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should create TypeGenerator with adapter instance from config', async () => {
      const config = {
        adapter: mockAdapter,
      }

      const generator = await TypeGenerator.create('test', config)

      expect(generator).toBeInstanceOf(TypeGenerator)
      expect(mockAdapter.initialize).toHaveBeenCalledOnce()
    })

    it('should throw error for unknown adapter name', async () => {
      const config = {}

      await expect(
        TypeGenerator.create('unknown-adapter', config)
      ).rejects.toThrow('Unknown adapter: unknown-adapter')
    })

    it('should throw error when adapter package is not installed', async () => {
      const config = {}

      // Sanity will fail to import since it's not actually installed in tests
      await expect(
        TypeGenerator.create('sanity', config)
      ).rejects.toThrow()
    })

    it('should initialize adapter after creation', async () => {
      const config = {
        adapter: mockAdapter,
      }

      await TypeGenerator.create('test', config)

      expect(mockAdapter.initialize).toHaveBeenCalledOnce()
    })
  })

  describe('getSchemas', () => {
    it('should fetch schemas from adapter', async () => {
      const mockSchemas: DocumentSchema[] = [
        {
          name: 'Post',
          type: 'post',
          fields: [
            { name: 'title', type: 'string', required: true },
          ],
        },
      ]

      mockAdapter.getSchemas = vi.fn().mockResolvedValue(mockSchemas)

      const generator = await TypeGenerator.create('test', { adapter: mockAdapter })
      const schemas = await generator.getSchemas()

      expect(schemas).toEqual(mockSchemas)
      expect(mockAdapter.getSchemas).toHaveBeenCalledOnce()
    })

    it('should throw error when adapter does not support getSchemas', async () => {
      const adapterWithoutSchemas = {
        ...mockAdapter,
      }
      delete (adapterWithoutSchemas as any).getSchemas

      const generator = await TypeGenerator.create('test', {
        adapter: adapterWithoutSchemas as any,
      })

      await expect(generator.getSchemas()).rejects.toThrow(
        /Schema fetching not yet implemented/
      )
    })
  })

  describe('generateTypes', () => {
    it('should call adapter generateTypes method', async () => {
      const mockSchemas: DocumentSchema[] = [
        {
          name: 'Post',
          type: 'post',
          fields: [
            { name: 'title', type: 'string', required: true },
          ],
        },
      ]

      const expectedOutput = {
        imports: ['import type { BaseDocument } from "@contentbridge/core"'],
        interfaces: 'export interface Post extends BaseDocument { title: string }',
        schemas: null,
      }

      mockAdapter.generateTypes = vi.fn().mockResolvedValue(expectedOutput)

      const generator = await TypeGenerator.create('test', { adapter: mockAdapter })
      const result = await generator.generateTypes(mockSchemas)

      expect(result).toEqual(expectedOutput)
      expect(mockAdapter.generateTypes).toHaveBeenCalledWith(mockSchemas, {})
    })

    it('should pass options to adapter generateTypes', async () => {
      const mockSchemas: DocumentSchema[] = []
      const options = {
        format: 'both' as const,
        includeDocumentation: true,
        strict: true,
        includeHelpers: false,
      }

      const generator = await TypeGenerator.create('test', { adapter: mockAdapter })
      await generator.generateTypes(mockSchemas, options)

      expect(mockAdapter.generateTypes).toHaveBeenCalledWith(mockSchemas, options)
    })
  })

  describe('generateZodSchemas', () => {
    it('should call adapter generateZodSchemas method', async () => {
      const mockSchemas: DocumentSchema[] = [
        {
          name: 'Post',
          type: 'post',
          fields: [
            { name: 'title', type: 'string', required: true },
          ],
        },
      ]

      const expectedOutput = 'export const PostSchema = z.object({ title: z.string() })'
      mockAdapter.generateZodSchemas = vi.fn().mockResolvedValue(expectedOutput)

      const generator = await TypeGenerator.create('test', { adapter: mockAdapter })
      const result = await generator.generateZodSchemas(mockSchemas)

      expect(result).toBe(expectedOutput)
      expect(mockAdapter.generateZodSchemas).toHaveBeenCalledWith(mockSchemas, {})
    })

    it('should pass options to adapter generateZodSchemas', async () => {
      const mockSchemas: DocumentSchema[] = []
      const options = {
        strict: true,
      }

      const generator = await TypeGenerator.create('test', { adapter: mockAdapter })
      await generator.generateZodSchemas(mockSchemas, options)

      expect(mockAdapter.generateZodSchemas).toHaveBeenCalledWith(mockSchemas, options)
    })
  })

  describe('cleanup', () => {
    it('should call adapter cleanup method', async () => {
      const generator = await TypeGenerator.create('test', { adapter: mockAdapter })
      await generator.cleanup()

      expect(mockAdapter.cleanup).toHaveBeenCalledOnce()
    })
  })
})

describe('TypeGeneratorUtils', () => {
  describe('fieldToTypeString', () => {
    it('should convert string field to TypeScript type', () => {
      const field: FieldSchema = {
        name: 'title',
        type: 'string',
        required: true,
      }

      const result = TypeGeneratorUtils.fieldToTypeString(field)
      expect(result).toBe('string')
    })

    it('should add undefined for optional fields', () => {
      const field: FieldSchema = {
        name: 'subtitle',
        type: 'string',
        required: false,
      }

      const result = TypeGeneratorUtils.fieldToTypeString(field)
      expect(result).toBe('string | undefined')
    })

    it('should handle number fields', () => {
      const field: FieldSchema = {
        name: 'count',
        type: 'number',
        required: true,
      }

      const result = TypeGeneratorUtils.fieldToTypeString(field)
      expect(result).toBe('number')
    })

    it('should handle boolean fields', () => {
      const field: FieldSchema = {
        name: 'published',
        type: 'boolean',
        required: true,
      }

      const result = TypeGeneratorUtils.fieldToTypeString(field)
      expect(result).toBe('boolean')
    })

    it('should handle date fields as string', () => {
      const field: FieldSchema = {
        name: 'publishedAt',
        type: 'date',
        required: true,
      }

      const result = TypeGeneratorUtils.fieldToTypeString(field)
      expect(result).toBe('string')
    })

    it('should handle array fields', () => {
      const field: FieldSchema = {
        name: 'tags',
        type: 'array',
        required: true,
        of: [{ type: 'string', name: 'tag' }],
      }

      const result = TypeGeneratorUtils.fieldToTypeString(field)
      expect(result).toBe('string[]')
    })

    it('should handle reference fields', () => {
      const field: FieldSchema = {
        name: 'author',
        type: 'reference',
        required: true,
        to: ['author'],
      }

      const result = TypeGeneratorUtils.fieldToTypeString(field)
      expect(result).toBe("{ _type: 'reference'; _ref: string }")
    })

    it('should handle image fields', () => {
      const field: FieldSchema = {
        name: 'mainImage',
        type: 'image',
        required: true,
      }

      const result = TypeGeneratorUtils.fieldToTypeString(field)
      expect(result).toBe('MediaAsset')
    })

    it('should handle block/rich text fields', () => {
      const field: FieldSchema = {
        name: 'content',
        type: 'block',
        required: true,
      }

      const result = TypeGeneratorUtils.fieldToTypeString(field)
      expect(result).toBe('RichTextContent')
    })

    it('should handle text fields as string', () => {
      const field: FieldSchema = {
        name: 'description',
        type: 'text',
        required: true,
      }

      const result = TypeGeneratorUtils.fieldToTypeString(field)
      expect(result).toBe('string')
    })

    it('should handle url fields as string', () => {
      const field: FieldSchema = {
        name: 'website',
        type: 'url',
        required: true,
      }

      const result = TypeGeneratorUtils.fieldToTypeString(field)
      expect(result).toBe('string')
    })

    it('should handle email fields as string', () => {
      const field: FieldSchema = {
        name: 'email',
        type: 'email',
        required: true,
      }

      const result = TypeGeneratorUtils.fieldToTypeString(field)
      expect(result).toBe('string')
    })
  })

  describe('fieldToZodString', () => {
    it('should convert string field to Zod schema', () => {
      const field: FieldSchema = {
        name: 'title',
        type: 'string',
        required: true,
      }

      const result = TypeGeneratorUtils.fieldToZodString(field)
      expect(result).toBe('z.string()')
    })

    it('should add optional() for optional fields', () => {
      const field: FieldSchema = {
        name: 'subtitle',
        type: 'string',
        required: false,
      }

      const result = TypeGeneratorUtils.fieldToZodString(field)
      expect(result).toBe('z.string().optional()')
    })

    it('should handle number fields', () => {
      const field: FieldSchema = {
        name: 'count',
        type: 'number',
        required: true,
      }

      const result = TypeGeneratorUtils.fieldToZodString(field)
      expect(result).toBe('z.number()')
    })

    it('should handle boolean fields', () => {
      const field: FieldSchema = {
        name: 'published',
        type: 'boolean',
        required: true,
      }

      const result = TypeGeneratorUtils.fieldToZodString(field)
      expect(result).toBe('z.boolean()')
    })

    it('should handle datetime fields', () => {
      const field: FieldSchema = {
        name: 'publishedAt',
        type: 'datetime',
        required: true,
      }

      const result = TypeGeneratorUtils.fieldToZodString(field)
      expect(result).toBe('z.string().datetime()')
    })

    it('should handle array fields', () => {
      const field: FieldSchema = {
        name: 'tags',
        type: 'array',
        required: true,
        of: [{ type: 'string', name: 'tag' }],
      }

      const result = TypeGeneratorUtils.fieldToZodString(field)
      expect(result).toBe('z.array(z.string())')
    })

    it('should handle reference fields', () => {
      const field: FieldSchema = {
        name: 'author',
        type: 'reference',
        required: true,
        to: ['author'],
      }

      const result = TypeGeneratorUtils.fieldToZodString(field)
      expect(result).toBe('z.object({ _type: z.literal("reference"), _ref: z.string() })')
    })
  })

  describe('generateInterface', () => {
    it('should generate TypeScript interface from schema', () => {
      const schema: DocumentSchema = {
        name: 'Post',
        type: 'post',
        description: 'A blog post',
        fields: [
          { name: 'title', type: 'string', required: true },
          { name: 'content', type: 'text', required: true },
          { name: 'publishedAt', type: 'datetime', required: false },
        ],
      }

      const result = TypeGeneratorUtils.generateInterface(schema)

      expect(result).toContain('export interface Post extends BaseDocument')
      expect(result).toContain("_type: 'post'")
      expect(result).toContain('title: string')
      expect(result).toContain('content: string')
      expect(result).toContain('publishedAt?: string | undefined')
      expect(result).toContain('A blog post')
    })

    it('should include field descriptions', () => {
      const schema: DocumentSchema = {
        name: 'Author',
        type: 'author',
        fields: [
          {
            name: 'name',
            type: 'string',
            required: true,
            description: 'The author name',
          },
        ],
      }

      const result = TypeGeneratorUtils.generateInterface(schema)

      expect(result).toContain('/** The author name */')
    })

    it('should handle schemas without description', () => {
      const schema: DocumentSchema = {
        name: 'Tag',
        type: 'tag',
        fields: [
          { name: 'label', type: 'string', required: true },
        ],
      }

      const result = TypeGeneratorUtils.generateInterface(schema)

      expect(result).toContain('export interface Tag extends BaseDocument')
      expect(result).not.toContain('/**')
    })
  })

  describe('generateZodSchema', () => {
    it('should generate Zod schema from document schema', () => {
      const schema: DocumentSchema = {
        name: 'Post',
        type: 'post',
        fields: [
          { name: 'title', type: 'string', required: true },
          { name: 'content', type: 'text', required: true },
          { name: 'publishedAt', type: 'datetime', required: false },
        ],
      }

      const result = TypeGeneratorUtils.generateZodSchema(schema)

      expect(result).toContain('export const PostSchema = z.object({')
      expect(result).toContain("_type: z.literal('post')")
      expect(result).toContain('title: z.string()')
      expect(result).toContain('content: z.string()')
      expect(result).toContain('publishedAt: z.string().datetime().optional()')
    })

    it('should handle required and optional fields correctly', () => {
      const schema: DocumentSchema = {
        name: 'Product',
        type: 'product',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'description', type: 'text', required: false },
        ],
      }

      const result = TypeGeneratorUtils.generateZodSchema(schema)

      expect(result).toContain('name: z.string()')
      expect(result).toContain('description: z.string().optional()')
    })
  })
})
