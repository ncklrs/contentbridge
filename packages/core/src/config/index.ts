/**
 * Configuration utilities for ContentBridge
 */

import type { BaseAdapter } from '../adapters/BaseAdapter.js'

/**
 * ContentBridge configuration options
 */
export interface ContentBridgeConfig {
  /**
   * CMS adapter instance
   */
  adapter: BaseAdapter

  /**
   * Output path for generated types
   * @default 'src/types/contentbridge.generated.ts'
   */
  outputPath?: string

  /**
   * Enable watch mode for auto-regeneration
   * @default false
   */
  watch?: boolean

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean
}

/**
 * Define a ContentBridge configuration
 *
 * Helper function for type-safe configuration
 *
 * @example
 * ```typescript
 * import { defineConfig } from '@contentbridge/core'
 * import { SanityAdapter } from '@contentbridge/sanity'
 *
 * export default defineConfig({
 *   adapter: new SanityAdapter({
 *     projectId: 'abc123',
 *     dataset: 'production',
 *     apiVersion: '2024-01-01'
 *   }),
 *   outputPath: 'src/types/contentbridge.generated.ts'
 * })
 * ```
 */
export function defineConfig(config: ContentBridgeConfig): ContentBridgeConfig {
  return config
}
