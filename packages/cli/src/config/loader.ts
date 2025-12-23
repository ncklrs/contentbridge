/**
 * Configuration loader
 *
 * Loads and validates ContentBridge configuration files
 */

import { cosmiconfig } from 'cosmiconfig'
import { z } from 'zod'
import type { BaseAdapter } from '@contentbridge/core'

// Configuration schema
const configSchema = z.object({
  adapter: z.union([
    z.string(),
    z.custom<BaseAdapter>((val) => {
      return val && typeof val === 'object' && 'name' in val && 'version' in val
    }),
  ]).optional(),
  outputPath: z.string().optional(),
  watch: z.boolean().optional(),
  debug: z.boolean().optional(),
})

export type ContentBridgeConfig = z.infer<typeof configSchema>

/**
 * Load ContentBridge configuration from file
 *
 * Searches for configuration in:
 * - contentbridge.config.ts
 * - contentbridge.config.js
 * - contentbridge.config.mjs
 * - contentbridge property in package.json
 * - .contentbridgerc
 *
 * @param configPath - Optional explicit config file path
 * @returns Validated configuration
 */
export async function loadConfig(configPath?: string): Promise<ContentBridgeConfig> {
  const explorer = cosmiconfig('contentbridge', {
    searchPlaces: [
      'contentbridge.config.ts',
      'contentbridge.config.js',
      'contentbridge.config.mjs',
      'contentbridge.config.cjs',
      '.contentbridgerc',
      '.contentbridgerc.json',
      '.contentbridgerc.js',
      'package.json',
    ],
    loaders: {
      '.ts': async (filepath: string) => {
        // Dynamically import TypeScript config files
        // This requires tsx or ts-node to be available
        try {
          const module = await import(filepath)
          return module.default || module
        } catch (error) {
          throw new Error(
            `Failed to load TypeScript config: ${filepath}\n` +
            'Make sure you have tsx installed: npm install -D tsx'
          )
        }
      },
    },
  })

  let result

  if (configPath) {
    // Load from explicit path
    result = await explorer.load(configPath)
  } else {
    // Search for config file
    result = await explorer.search()
  }

  if (!result || !result.config) {
    // Return empty config if no file found
    return {}
  }

  // Validate configuration
  try {
    return configSchema.parse(result.config)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue =>
        `  - ${issue.path.join('.')}: ${issue.message}`
      ).join('\n')

      throw new Error(
        `Invalid configuration in ${result.filepath}:\n${issues}`
      )
    }
    throw error
  }
}

/**
 * Define a ContentBridge configuration
 *
 * Helper function for type-safe configuration in TypeScript
 *
 * @example
 * ```typescript
 * import { defineConfig } from '@contentbridge/cli/config'
 * import { SanityAdapter } from '@contentbridge/sanity'
 *
 * export default defineConfig({
 *   adapter: new SanityAdapter({ ... }),
 *   outputPath: 'src/types/contentbridge.generated.ts'
 * })
 * ```
 */
export function defineConfig(config: ContentBridgeConfig): ContentBridgeConfig {
  return config
}
