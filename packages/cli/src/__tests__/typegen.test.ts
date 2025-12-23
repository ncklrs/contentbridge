/**
 * Unit tests for typegen command
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { typegenCommand } from '../commands/typegen.js'
import * as configLoader from '../config/loader.js'
import * as fs from 'fs'
import { TypeGenerator } from '../typegen/TypeGenerator.js'
import type { DocumentSchema } from '@contentbridge/core/types'

// Mock dependencies
vi.mock('../config/loader.js', () => ({
  loadConfig: vi.fn(),
}))

vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}))

vi.mock('path', () => ({
  dirname: vi.fn((path) => path.split('/').slice(0, -1).join('/')),
}))

vi.mock('../typegen/TypeGenerator.js', () => ({
  TypeGenerator: {
    create: vi.fn(),
  },
}))

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    text: '',
  })),
}))

describe('Typegen Command', () => {
  let consoleLogSpy: any
  let consoleErrorSpy: any
  let processExitSpy: any
  let mockGenerator: any

  const mockSchemas: DocumentSchema[] = [
    {
      name: 'Post',
      type: 'post',
      description: 'A blog post',
      fields: [
        { name: 'title', type: 'string', required: true },
        { name: 'content', type: 'text', required: true },
        { name: 'publishedAt', type: 'datetime', required: false },
      ],
    },
    {
      name: 'Author',
      type: 'author',
      description: 'An author',
      fields: [
        { name: 'name', type: 'string', required: true },
        { name: 'email', type: 'email', required: true },
      ],
    },
  ]

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    mockGenerator = {
      getSchemas: vi.fn().mockResolvedValue(mockSchemas),
      generateTypes: vi.fn().mockResolvedValue({
        imports: ['import type { BaseDocument } from "@contentbridge/core"'],
        interfaces: 'export interface Post extends BaseDocument { _type: "post"; title: string; }',
        schemas: null,
      }),
    }

    vi.mocked(TypeGenerator.create).mockResolvedValue(mockGenerator)
    vi.clearAllMocks()
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    processExitSpy.mockRestore()
  })

  describe('adapter configuration', () => {
    it('should exit when no adapter is specified in options or config', async () => {
      vi.mocked(configLoader.loadConfig).mockResolvedValue({})

      await typegenCommand({})

      expect(processExitSpy).toHaveBeenCalledWith(1)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Please specify an adapter')
      )
    })

    it('should use adapter from options', async () => {
      vi.mocked(configLoader.loadConfig).mockResolvedValue({})

      await typegenCommand({ adapter: 'sanity' })

      expect(TypeGenerator.create).toHaveBeenCalledWith('sanity', {})
    })

    it('should use adapter from config', async () => {
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        adapter: 'payload',
      })

      await typegenCommand({})

      expect(TypeGenerator.create).toHaveBeenCalledWith('payload', {
        adapter: 'payload',
      })
    })

    it('should prefer adapter from options over config', async () => {
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        adapter: 'payload',
      })

      await typegenCommand({ adapter: 'sanity' })

      expect(TypeGenerator.create).toHaveBeenCalledWith('sanity', {
        adapter: 'payload',
      })
    })

    it('should handle adapter instance from config', async () => {
      const mockAdapter = {
        name: 'sanity',
        version: '1.0.0',
      }

      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        adapter: mockAdapter,
      })

      await typegenCommand({})

      expect(TypeGenerator.create).toHaveBeenCalledWith('sanity', {
        adapter: mockAdapter,
      })
    })
  })

  describe('schema fetching', () => {
    it('should fetch schemas from adapter', async () => {
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        adapter: 'sanity',
      })

      await typegenCommand({})

      expect(mockGenerator.getSchemas).toHaveBeenCalledOnce()
    })

    it('should warn when no schemas found', async () => {
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        adapter: 'sanity',
      })
      mockGenerator.getSchemas.mockResolvedValue([])

      await typegenCommand({})

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Make sure your CMS has schemas defined')
      )
    })

    it('should continue when schemas are found', async () => {
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        adapter: 'sanity',
      })

      await typegenCommand({})

      expect(mockGenerator.generateTypes).toHaveBeenCalled()
      expect(fs.writeFileSync).toHaveBeenCalled()
    })
  })

  describe('type generation', () => {
    beforeEach(() => {
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        adapter: 'sanity',
      })
    })

    it('should generate TypeScript types by default', async () => {
      await typegenCommand({})

      expect(mockGenerator.generateTypes).toHaveBeenCalledWith(
        mockSchemas,
        expect.objectContaining({
          format: 'typescript',
          includeDocumentation: true,
          strict: true,
          includeHelpers: true,
        })
      )
    })

    it('should generate both types and Zod schemas when --zod flag is set', async () => {
      await typegenCommand({ zod: true })

      expect(mockGenerator.generateTypes).toHaveBeenCalledWith(
        mockSchemas,
        expect.objectContaining({
          format: 'both',
        })
      )
    })

    it('should use output path from options', async () => {
      await typegenCommand({ output: 'custom/path/types.ts' })

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'custom/path/types.ts',
        expect.any(String),
        'utf-8'
      )
    })

    it('should use output path from config', async () => {
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        adapter: 'sanity',
        outputPath: 'types/contentbridge.ts',
      })

      await typegenCommand({})

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'types/contentbridge.ts',
        expect.any(String),
        'utf-8'
      )
    })

    it('should use default output path when not specified', async () => {
      await typegenCommand({})

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'src/types/contentbridge.generated.ts',
        expect.any(String),
        'utf-8'
      )
    })

    it('should create output directory if it does not exist', async () => {
      await typegenCommand({ output: 'custom/nested/path/types.ts' })

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        'custom/nested/path',
        { recursive: true }
      )
    })

    it('should write file with header comment', async () => {
      await typegenCommand({})

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0]
      const fileContent = writeCall[1] as string

      expect(fileContent).toContain('Generated by ContentBridge CLI')
      expect(fileContent).toContain('Do not edit this file manually')
      expect(fileContent).toContain('Generated from')
    })

    it('should include imports in generated file', async () => {
      await typegenCommand({})

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0]
      const fileContent = writeCall[1] as string

      expect(fileContent).toContain('import type { BaseDocument }')
    })

    it('should include interfaces in generated file', async () => {
      await typegenCommand({})

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0]
      const fileContent = writeCall[1] as string

      expect(fileContent).toContain('export interface Post')
    })
  })

  describe('Zod schema generation', () => {
    beforeEach(() => {
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        adapter: 'sanity',
      })

      mockGenerator.generateTypes.mockResolvedValue({
        imports: ['import type { BaseDocument } from "@contentbridge/core"'],
        interfaces: 'export interface Post extends BaseDocument { _type: "post"; }',
        schemas: 'export const PostSchema = z.object({ _type: z.literal("post") })',
      })
    })

    it('should write Zod schemas to separate file when --zod flag is set', async () => {
      await typegenCommand({ zod: true, output: 'types/generated.ts' })

      expect(fs.writeFileSync).toHaveBeenCalledTimes(2)

      const zodWriteCall = vi.mocked(fs.writeFileSync).mock.calls.find(
        call => call[0] === 'types/generated.zod.ts'
      )

      expect(zodWriteCall).toBeDefined()
    })

    it('should include Zod import in schema file', async () => {
      await typegenCommand({ zod: true, output: 'types/generated.ts' })

      const zodWriteCall = vi.mocked(fs.writeFileSync).mock.calls.find(
        call => call[0] === 'types/generated.zod.ts'
      )

      const zodContent = zodWriteCall![1] as string
      expect(zodContent).toContain("import { z } from 'zod'")
    })

    it('should include generated schemas in Zod file', async () => {
      await typegenCommand({ zod: true, output: 'types/generated.ts' })

      const zodWriteCall = vi.mocked(fs.writeFileSync).mock.calls.find(
        call => call[0] === 'types/generated.zod.ts'
      )

      const zodContent = zodWriteCall![1] as string
      expect(zodContent).toContain('export const PostSchema')
    })

    it('should not write Zod file when --zod flag is not set', async () => {
      await typegenCommand({ output: 'types/generated.ts' })

      expect(fs.writeFileSync).toHaveBeenCalledTimes(1)
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'types/generated.ts',
        expect.any(String),
        'utf-8'
      )
    })
  })

  describe('watch mode', () => {
    beforeEach(() => {
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        adapter: 'sanity',
      })
    })

    it('should display watch message when --watch flag is set', async () => {
      await typegenCommand({ watch: true })

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Watching for schema changes')
      )
    })

    it('should not display watch message when --watch flag is not set', async () => {
      await typegenCommand({})

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Watching for schema changes')
      )
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        adapter: 'sanity',
      })
    })

    it('should handle config loading errors', async () => {
      vi.mocked(configLoader.loadConfig).mockRejectedValue(
        new Error('Config not found')
      )

      await typegenCommand({})

      expect(processExitSpy).toHaveBeenCalledWith(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.anything(),
        'Config not found'
      )
    })

    it('should handle adapter creation errors', async () => {
      vi.mocked(TypeGenerator.create).mockRejectedValue(
        new Error('Adapter not found')
      )

      await typegenCommand({})

      expect(processExitSpy).toHaveBeenCalledWith(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.anything(),
        'Adapter not found'
      )
    })

    it('should handle schema fetching errors', async () => {
      mockGenerator.getSchemas.mockRejectedValue(
        new Error('Failed to fetch schemas')
      )

      await typegenCommand({})

      expect(processExitSpy).toHaveBeenCalledWith(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.anything(),
        'Failed to fetch schemas'
      )
    })

    it('should handle type generation errors', async () => {
      mockGenerator.generateTypes.mockRejectedValue(
        new Error('Failed to generate types')
      )

      await typegenCommand({})

      expect(processExitSpy).toHaveBeenCalledWith(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.anything(),
        'Failed to generate types'
      )
    })

    it('should handle file write errors', async () => {
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      await typegenCommand({})

      expect(processExitSpy).toHaveBeenCalledWith(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.anything(),
        'Permission denied'
      )
    })

    it('should show stack trace when DEBUG env is set', async () => {
      const originalDebug = process.env.DEBUG
      process.env.DEBUG = 'true'

      const error = new Error('Test error')
      error.stack = 'Error stack trace'
      mockGenerator.getSchemas.mockRejectedValue(error)

      await typegenCommand({})

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Stack trace')
      )

      process.env.DEBUG = originalDebug
    })
  })

  describe('config file loading', () => {
    it('should load config from specified path', async () => {
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        adapter: 'sanity',
      })

      await typegenCommand({ config: '/custom/config.ts' })

      expect(configLoader.loadConfig).toHaveBeenCalledWith('/custom/config.ts')
    })

    it('should load config without path when not specified', async () => {
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        adapter: 'sanity',
      })

      await typegenCommand({})

      expect(configLoader.loadConfig).toHaveBeenCalledWith(undefined)
    })
  })
})
