/**
 * Unit tests for init command
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { initCommand } from '../commands/init.js'
import * as fs from 'fs'
import * as path from 'path'

// Mock fs and path modules
vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
}))

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
}))

// Mock ora spinner
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    text: '',
  })),
}))

describe('Init Command', () => {
  let consoleLogSpy: any
  let processExitSpy: any

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    vi.clearAllMocks()
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    processExitSpy.mockRestore()
  })

  describe('adapter selection', () => {
    it('should exit when no adapter is specified', async () => {
      await initCommand({})

      expect(processExitSpy).toHaveBeenCalledWith(1)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Please specify an adapter')
      )
    })

    it('should exit when unknown adapter is specified', async () => {
      await initCommand({ adapter: 'unknown' })

      expect(processExitSpy).toHaveBeenCalledWith(1)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Supported adapters')
      )
    })

    it('should accept sanity adapter', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await initCommand({ adapter: 'sanity', dir: '/test' })

      expect(processExitSpy).not.toHaveBeenCalled()
      expect(fs.writeFileSync).toHaveBeenCalled()
    })

    it('should accept payload adapter', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await initCommand({ adapter: 'payload', dir: '/test' })

      expect(processExitSpy).not.toHaveBeenCalled()
      expect(fs.writeFileSync).toHaveBeenCalled()
    })

    it('should accept contentful adapter', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await initCommand({ adapter: 'contentful', dir: '/test' })

      expect(processExitSpy).not.toHaveBeenCalled()
      expect(fs.writeFileSync).toHaveBeenCalled()
    })

    it('should accept strapi adapter', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await initCommand({ adapter: 'strapi', dir: '/test' })

      expect(processExitSpy).not.toHaveBeenCalled()
      expect(fs.writeFileSync).toHaveBeenCalled()
    })
  })

  describe('config file creation', () => {
    it('should create config file with correct template for sanity', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await initCommand({ adapter: 'sanity', dir: '/test' })

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(
        call => call[0] === '/test/contentbridge.config.ts'
      )

      expect(writeCall).toBeDefined()
      expect(writeCall![1]).toContain('SanityAdapter')
      expect(writeCall![1]).toContain('SANITY_PROJECT_ID')
      expect(writeCall![1]).toContain('SANITY_DATASET')
    })

    it('should create config file with correct template for payload', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await initCommand({ adapter: 'payload', dir: '/test' })

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(
        call => call[0] === '/test/contentbridge.config.ts'
      )

      expect(writeCall).toBeDefined()
      expect(writeCall![1]).toContain('PayloadAdapter')
      expect(writeCall![1]).toContain('PAYLOAD_SERVER_URL')
      expect(writeCall![1]).toContain('PAYLOAD_API_KEY')
    })

    it('should create config file with correct template for contentful', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await initCommand({ adapter: 'contentful', dir: '/test' })

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(
        call => call[0] === '/test/contentbridge.config.ts'
      )

      expect(writeCall).toBeDefined()
      expect(writeCall![1]).toContain('ContentfulAdapter')
      expect(writeCall![1]).toContain('CONTENTFUL_SPACE_ID')
      expect(writeCall![1]).toContain('CONTENTFUL_ACCESS_TOKEN')
    })

    it('should create config file with correct template for strapi', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await initCommand({ adapter: 'strapi', dir: '/test' })

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(
        call => call[0] === '/test/contentbridge.config.ts'
      )

      expect(writeCall).toBeDefined()
      expect(writeCall![1]).toContain('StrapiAdapter')
      expect(writeCall![1]).toContain('STRAPI_API_URL')
      expect(writeCall![1]).toContain('STRAPI_API_TOKEN')
    })

    it('should use current working directory when no dir specified', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      const cwd = process.cwd()

      await initCommand({ adapter: 'sanity' })

      expect(vi.mocked(path.join)).toHaveBeenCalledWith(cwd, 'contentbridge.config.ts')
    })

    it('should use specified directory', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await initCommand({ adapter: 'sanity', dir: '/custom/path' })

      expect(vi.mocked(path.join)).toHaveBeenCalledWith('/custom/path', 'contentbridge.config.ts')
    })
  })

  describe('env file creation', () => {
    it('should create .env.example for sanity', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await initCommand({ adapter: 'sanity', dir: '/test' })

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(
        call => call[0] === '/test/.env.example'
      )

      expect(writeCall).toBeDefined()
      expect(writeCall![1]).toContain('SANITY_PROJECT_ID')
      expect(writeCall![1]).toContain('SANITY_DATASET')
    })

    it('should create .env.example for payload', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await initCommand({ adapter: 'payload', dir: '/test' })

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(
        call => call[0] === '/test/.env.example'
      )

      expect(writeCall).toBeDefined()
      expect(writeCall![1]).toContain('PAYLOAD_SERVER_URL')
      expect(writeCall![1]).toContain('PAYLOAD_API_KEY')
    })

    it('should create .env.example for contentful', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await initCommand({ adapter: 'contentful', dir: '/test' })

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(
        call => call[0] === '/test/.env.example'
      )

      expect(writeCall).toBeDefined()
      expect(writeCall![1]).toContain('CONTENTFUL_SPACE_ID')
      expect(writeCall![1]).toContain('CONTENTFUL_ACCESS_TOKEN')
    })

    it('should create .env.example for strapi', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await initCommand({ adapter: 'strapi', dir: '/test' })

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(
        call => call[0] === '/test/.env.example'
      )

      expect(writeCall).toBeDefined()
      expect(writeCall![1]).toContain('STRAPI_API_URL')
      expect(writeCall![1]).toContain('STRAPI_API_TOKEN')
    })

    it('should not overwrite existing .env.example', async () => {
      vi.mocked(fs.existsSync).mockImplementation(
        (path) => path.toString().includes('.env.example')
      )

      await initCommand({ adapter: 'sanity', dir: '/test' })

      const envWriteCalls = vi.mocked(fs.writeFileSync).mock.calls.filter(
        call => call[0].toString().includes('.env.example')
      )

      expect(envWriteCalls).toHaveLength(0)
    })
  })

  describe('existing config handling', () => {
    it('should warn and exit when config already exists', async () => {
      vi.mocked(fs.existsSync).mockImplementation(
        (path) => path.toString().includes('contentbridge.config.ts')
      )

      await initCommand({ adapter: 'sanity', dir: '/test' })

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Config file already exists')
      )

      // Should not write files
      expect(fs.writeFileSync).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    let consoleErrorSpy: any

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('should handle file write errors', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      await initCommand({ adapter: 'sanity', dir: '/test' })

      expect(processExitSpy).toHaveBeenCalledWith(1)
      // Error is shown via console.error, not console.log
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.anything(),
        'Permission denied'
      )
    })
  })

  describe('success output', () => {
    beforeEach(() => {
      // Reset file system mocks to default behavior for success tests
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(fs.writeFileSync).mockImplementation(() => {})
    })

    it('should display next steps after successful init', async () => {
      await initCommand({ adapter: 'sanity', dir: '/test' })

      // Check multiple console.log calls for the success output
      const allLogCalls = consoleLogSpy.mock.calls.map(call => call.join(' '))
      const hasNextSteps = allLogCalls.some(log => log.includes('Next steps'))
      const hasTypegen = allLogCalls.some(log => log.includes('contentbridge typegen'))

      expect(hasNextSteps).toBe(true)
      expect(hasTypegen).toBe(true)
    })
  })
})
