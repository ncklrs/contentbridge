/**
 * ContentBridge Core Package
 *
 * Universal content abstraction layer for headless CMS platforms.
 * Provides a unified interface for querying, mutating, and managing
 * content across Sanity, Contentful, Payload, Strapi, and other CMSs.
 *
 * @packageDocumentation
 */

// Export all types (document, query, richtext, media)
export * from './types'

// Export service layer
export * from './service'

// Export adapters
export * from './adapters'

// Export utilities
export * from './utils'

// Export config helper
export { defineConfig } from './config/index.js'
