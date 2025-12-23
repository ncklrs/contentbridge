/**
 * BaseAdapter tests
 *
 * Tests for the base adapter contract and abstract class
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { BaseAdapter } from '../BaseAdapter'
import type { AdapterConfig, GeneratedTypes, TypeGenerationOptions } from '../BaseAdapter'
import type { BaseDocument, DocumentReference, DocumentSchema } from '../../types/document'
import type { QueryConfig, QueryResult, SingleResult } from '../../types/query'
import type { TransactionOperation, TransactionResult } from '../../service/ContentService'
import type { MediaAsset } from '../../types/media'
import type { UniversalRichText } from '../BaseAdapter'

// Test adapter implementation
class TestAdapter extends BaseAdapter {
  readonly name = 'test'
  readonly version = '1.0.0'

  async compileQuery<T = unknown>(_config: QueryConfig<T>): Promise<string> {
    return '*[_type == "test"]'
  }

  async executeQuery<T extends BaseDocument>(_config: QueryConfig<T>): Promise<QueryResult<T>> {
    return { data: [], total: 0, hasMore: false }
  }

  async count(_config: QueryConfig): Promise<number> {
    return 0
  }

  async getById<T extends BaseDocument>(
    _id: string,
    _options?: { resolveReferences?: boolean | number; includeDrafts?: boolean }
  ): Promise<SingleResult<T>> {
    return { data: null }
  }

  async create<T extends BaseDocument>(
    _documentType: string,
    _data: Omit<T, '_id' | '_type' | '_createdAt' | '_updatedAt' | '_rev'>
  ): Promise<T> {
    return { _id: 'test-id', _type: 'test' } as T
  }

  async update<T extends BaseDocument>(
    _id: string,
    _data: Partial<Omit<T, '_id' | '_type' | '_createdAt' | '_updatedAt' | '_rev'>>
  ): Promise<T> {
    return { _id: 'test-id', _type: 'test' } as T
  }

  async patch<T extends BaseDocument>(
    _id: string,
    _patches: Array<{ op: 'set' | 'unset' | 'insert' | 'replace'; path: string; value?: unknown }>
  ): Promise<T> {
    return { _id: 'test-id', _type: 'test' } as T
  }

  async delete<T extends BaseDocument>(_id: string): Promise<T> {
    return { _id: 'test-id', _type: 'test' } as T
  }

  async transaction(_operations: TransactionOperation[]): Promise<TransactionResult> {
    return { results: [] }
  }

  async toUniversalRichText(_nativeContent: unknown): Promise<UniversalRichText> {
    return { _type: 'richtext', content: [] }
  }

  async fromUniversalRichText(_universalContent: UniversalRichText): Promise<unknown> {
    return []
  }

  async resolveMediaUrl(
    _assetRef: string | DocumentReference | MediaAsset,
    _options?: Record<string, unknown>
  ): Promise<string> {
    return 'https://example.com/image.jpg'
  }

  async getResponsiveImage(): Promise<{
    src: string
    srcset: string
    sources: Array<{ srcset: string; type?: string; sizes?: string }>
    width: number
    height: number
    aspectRatio: number
    alt?: string
    lqip?: string
  }> {
    return {
      src: 'https://example.com/image.jpg',
      srcset: '',
      sources: [],
      width: 800,
      height: 600,
      aspectRatio: 4 / 3,
    }
  }

  async getPlaceholder(): Promise<string> {
    return 'data:image/png;base64,...'
  }

  async generateTypes(
    _schemas: DocumentSchema[],
    _options?: TypeGenerationOptions
  ): Promise<GeneratedTypes> {
    return {
      interfaces: '',
      exports: '',
      imports: [],
    }
  }

  async generateZodSchemas(
    _schemas: DocumentSchema[],
    _options?: TypeGenerationOptions
  ): Promise<string> {
    return ''
  }
}

describe('BaseAdapter', () => {
  let adapter: TestAdapter
  let config: AdapterConfig

  beforeEach(() => {
    config = {
      debug: false,
    }
    adapter = new TestAdapter(config)
  })

  describe('construction', () => {
    it('should initialize with config', () => {
      expect(adapter).toBeDefined()
      expect(adapter.name).toBe('test')
      expect(adapter.version).toBe('1.0.0')
    })

    it('should have default logger', async () => {
      await adapter.initialize()
      expect(adapter).toBeDefined()
    })
  })

  describe('getInfo', () => {
    it('should return adapter info', () => {
      const info = adapter.getInfo()

      expect(info.name).toBe('test')
      expect(info.version).toBe('1.0.0')
    })
  })

  describe('initialize', () => {
    it('should initialize adapter', async () => {
      await expect(adapter.initialize()).resolves.not.toThrow()
    })
  })

  describe('cleanup', () => {
    it('should cleanup adapter', async () => {
      await expect(adapter.cleanup()).resolves.not.toThrow()
    })
  })

  describe('query methods', () => {
    it('should compile query', async () => {
      const query = await adapter.compileQuery({ type: 'post' })
      expect(query).toBeDefined()
      expect(typeof query).toBe('string')
    })

    it('should execute query', async () => {
      const result = await adapter.executeQuery({ type: 'post' })
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('hasMore')
    })

    it('should count documents', async () => {
      const count = await adapter.count({ type: 'post' })
      expect(typeof count).toBe('number')
    })

    it('should get by ID', async () => {
      const result = await adapter.getById('test-id')
      expect(result).toHaveProperty('data')
    })
  })

  describe('mutation methods', () => {
    it('should create document', async () => {
      const doc = await adapter.create('post', {
        title: 'Test Post',
      })

      expect(doc._id).toBeDefined()
      expect(doc._type).toBeDefined()
    })

    it('should update document', async () => {
      const doc = await adapter.update('test-id', { title: 'Updated' })
      expect(doc._id).toBe('test-id')
    })

    it('should patch document', async () => {
      const doc = await adapter.patch('test-id', [
        { op: 'set', path: 'title', value: 'Patched' },
      ])
      expect(doc._id).toBe('test-id')
    })

    it('should delete document', async () => {
      const doc = await adapter.delete('test-id')
      expect(doc._id).toBe('test-id')
    })

    it('should execute transaction', async () => {
      const result = await adapter.transaction([])
      expect(result).toHaveProperty('results')
    })
  })

  describe('rich text methods', () => {
    it('should convert to universal format', async () => {
      const universal = await adapter.toUniversalRichText([])
      expect(universal._type).toBe('richtext')
      expect(universal.content).toBeDefined()
    })

    it('should convert from universal format', async () => {
      const native = await adapter.fromUniversalRichText({
        _type: 'richtext',
        content: [],
      })
      expect(native).toBeDefined()
    })
  })

  describe('media methods', () => {
    it('should resolve media URL', async () => {
      const url = await adapter.resolveMediaUrl('asset-123')
      expect(typeof url).toBe('string')
      expect(url).toContain('http')
    })

    it('should get responsive image', async () => {
      const image = await adapter.getResponsiveImage('asset-123', {
        widths: [400, 800, 1200],
      })
      expect(image).toHaveProperty('src')
      expect(image).toHaveProperty('srcset')
      expect(image).toHaveProperty('width')
      expect(image).toHaveProperty('height')
    })

    it('should get placeholder', async () => {
      const placeholder = await adapter.getPlaceholder('asset-123', {
        type: 'lqip',
      })
      expect(typeof placeholder).toBe('string')
    })
  })

  describe('type generation methods', () => {
    it('should generate types', async () => {
      const types = await adapter.generateTypes([])
      expect(types).toHaveProperty('interfaces')
      expect(types).toHaveProperty('exports')
      expect(types).toHaveProperty('imports')
    })

    it('should generate Zod schemas', async () => {
      const schemas = await adapter.generateZodSchemas([])
      expect(typeof schemas).toBe('string')
    })
  })
})
