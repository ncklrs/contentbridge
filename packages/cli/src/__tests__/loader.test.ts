/**
 * Unit tests for config loader
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { loadConfig, defineConfig } from '../config/loader.js'
import { cosmiconfig } from 'cosmiconfig'

// Mock cosmiconfig
vi.mock('cosmiconfig', () => ({
  cosmiconfig: vi.fn(),
}))

describe('Config Loader', () => {
  let mockExplorer: any

  beforeEach(() => {
    mockExplorer = {
      search: vi.fn(),
      load: vi.fn(),
    }
    vi.mocked(cosmiconfig).mockReturnValue(mockExplorer)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('loadConfig', () => {
    it('should load config from search when no path specified', async () => {
      const mockConfig = {
        adapter: 'sanity',
        outputPath: 'src/types/generated.ts',
      }

      mockExplorer.search.mockResolvedValue({
        config: mockConfig,
        filepath: 'contentbridge.config.ts',
      })

      const config = await loadConfig()

      expect(mockExplorer.search).toHaveBeenCalledOnce()
      expect(config).toEqual(mockConfig)
    })

    it('should load config from explicit path', async () => {
      const mockConfig = {
        adapter: 'payload',
        outputPath: 'types/cms.ts',
      }

      mockExplorer.load.mockResolvedValue({
        config: mockConfig,
        filepath: '/path/to/config.ts',
      })

      const config = await loadConfig('/path/to/config.ts')

      expect(mockExplorer.load).toHaveBeenCalledWith('/path/to/config.ts')
      expect(config).toEqual(mockConfig)
    })

    it('should return empty config when no config file found', async () => {
      mockExplorer.search.mockResolvedValue(null)

      const config = await loadConfig()

      expect(config).toEqual({})
    })

    it('should validate config schema', async () => {
      const mockConfig = {
        adapter: 'sanity',
        outputPath: 'src/types/generated.ts',
        watch: true,
        debug: false,
      }

      mockExplorer.search.mockResolvedValue({
        config: mockConfig,
        filepath: 'contentbridge.config.ts',
      })

      const config = await loadConfig()

      expect(config).toEqual(mockConfig)
      expect(config.adapter).toBe('sanity')
      expect(config.outputPath).toBe('src/types/generated.ts')
      expect(config.watch).toBe(true)
      expect(config.debug).toBe(false)
    })

    it('should accept adapter as object', async () => {
      const mockAdapter = {
        name: 'sanity',
        version: '1.0.0',
        initialize: vi.fn(),
      }

      const mockConfig = {
        adapter: mockAdapter,
        outputPath: 'src/types/generated.ts',
      }

      mockExplorer.search.mockResolvedValue({
        config: mockConfig,
        filepath: 'contentbridge.config.ts',
      })

      const config = await loadConfig()

      expect(config.adapter).toBe(mockAdapter)
    })

    it('should throw error for invalid config schema', async () => {
      const invalidConfig = {
        adapter: 123, // Invalid type
        outputPath: true, // Invalid type
      }

      mockExplorer.search.mockResolvedValue({
        config: invalidConfig,
        filepath: 'contentbridge.config.ts',
      })

      await expect(loadConfig()).rejects.toThrow('Invalid configuration')
    })

    it('should provide helpful error message for Zod validation errors', async () => {
      const invalidConfig = {
        outputPath: 123, // Should be string
      }

      mockExplorer.search.mockResolvedValue({
        config: invalidConfig,
        filepath: 'contentbridge.config.ts',
      })

      await expect(loadConfig()).rejects.toThrow(/outputPath/)
    })

    it('should handle TypeScript config file loading', async () => {
      const mockConfig = {
        adapter: 'sanity',
        outputPath: 'src/types/generated.ts',
      }

      mockExplorer.search.mockResolvedValue({
        config: mockConfig,
        filepath: 'contentbridge.config.ts',
      })

      const config = await loadConfig()

      expect(config).toEqual(mockConfig)

      // Verify cosmiconfig was configured with TS loader
      const cosmiconfigCall = vi.mocked(cosmiconfig).mock.calls[0]
      expect(cosmiconfigCall[1]).toHaveProperty('loaders')
      expect(cosmiconfigCall[1].loaders).toHaveProperty('.ts')
    })

    it('should handle config loading errors gracefully', async () => {
      mockExplorer.search.mockRejectedValue(new Error('File read error'))

      await expect(loadConfig()).rejects.toThrow('File read error')
    })
  })

  describe('defineConfig', () => {
    it('should return config object unchanged', () => {
      const config = {
        adapter: 'sanity',
        outputPath: 'types/generated.ts',
      }

      const result = defineConfig(config)

      expect(result).toBe(config)
      expect(result).toEqual(config)
    })

    it('should provide type safety for config', () => {
      const config = defineConfig({
        adapter: 'contentful',
        outputPath: 'src/contentful.ts',
        watch: true,
        debug: false,
      })

      expect(config.adapter).toBe('contentful')
      expect(config.watch).toBe(true)
    })

    it('should accept minimal config', () => {
      const config = defineConfig({})
      expect(config).toEqual({})
    })

    it('should accept adapter instance', () => {
      const mockAdapter = {
        name: 'sanity',
        version: '1.0.0',
        initialize: vi.fn(),
      }

      const config = defineConfig({
        adapter: mockAdapter,
      })

      expect(config.adapter).toBe(mockAdapter)
    })
  })
})
