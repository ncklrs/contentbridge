/**
 * @contentbridge/contentful
 *
 * Contentful CMS adapter for ContentBridge
 * Provides integration with Contentful's Content Delivery API and Content Management API
 *
 * @example
 * ```typescript
 * import { createClient } from 'contentful'
 * import { createContentfulAdapter } from '@contentbridge/contentful'
 *
 * // Create Contentful client
 * const deliveryClient = createClient({
 *   space: 'your-space-id',
 *   accessToken: 'your-access-token'
 * })
 *
 * // Create adapter
 * const adapter = createContentfulAdapter({
 *   spaceId: 'your-space-id',
 *   accessToken: 'your-access-token',
 *   deliveryClient,
 *   defaultLocale: 'en-US'
 * })
 *
 * // Initialize
 * await adapter.initialize()
 *
 * // Query content
 * const result = await adapter.executeQuery({
 *   type: 'blogPost',
 *   filter: [
 *     { field: 'featured', operator: '==', value: true }
 *   ],
 *   limit: 10
 * })
 * ```
 */

// Main adapter
export {
  ContentfulAdapter,
  createContentfulAdapter,
} from './ContentfulAdapter'
export type { ContentfulAdapterConfig } from './ContentfulAdapter'

// Query compiler
export {
  QueryCompiler,
  createContentfulCompiler,
} from './query/QueryCompiler'
export type {
  ContentfulCompilerConfig,
  ContentfulQuery,
} from './query/QueryCompiler'

// Rich text converter
export {
  RichTextConverter,
  createRichTextConverter,
  fromContentfulRichText,
  toContentfulRichText,
  BLOCKS,
  INLINES,
  MARKS,
} from './richtext/RichTextConverter'
