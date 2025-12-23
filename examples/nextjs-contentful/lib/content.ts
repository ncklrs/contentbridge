/**
 * ContentBridge setup for Contentful CMS
 *
 * This file configures the ContentBridge client with Contentful adapter.
 * Notice how similar this is to the Sanity setup - that's the power of ContentBridge!
 */

import { createContentfulAdapter } from '@contentbridge/contentful'
import { createClient } from 'contentful'
import type { BaseAdapter } from '@contentbridge/core'

// Determine if we're in preview mode (for draft content)
const isPreview = process.env.CONTENTFUL_PREVIEW_MODE === 'true'

// Use placeholder values if real credentials aren't provided (allows build to succeed)
const spaceId = process.env.NEXT_PUBLIC_CONTENTFUL_SPACE_ID || 'placeholder-space-id'
const accessToken = isPreview
  ? (process.env.CONTENTFUL_PREVIEW_ACCESS_TOKEN || 'placeholder-preview-token')
  : (process.env.CONTENTFUL_ACCESS_TOKEN || 'placeholder-access-token')

// Contentful client configuration
const contentfulClient = createClient({
  space: spaceId,
  environment: process.env.NEXT_PUBLIC_CONTENTFUL_ENVIRONMENT || 'master',
  accessToken,
  host: isPreview ? 'preview.contentful.com' : 'cdn.contentful.com',
})

// Create ContentBridge adapter for Contentful
const adapter = createContentfulAdapter({
  spaceId,
  environment: process.env.NEXT_PUBLIC_CONTENTFUL_ENVIRONMENT || 'master',
  accessToken,
  deliveryClient: contentfulClient,
  defaultLocale: 'en-US',
})

/**
 * Main ContentBridge adapter instance
 *
 * Use this throughout your application for CMS operations.
 * The API is identical to the Sanity example!
 *
 * @example
 * ```typescript
 * import { content } from '@/lib/content'
 *
 * // Get a single post by ID
 * const result = await content.getById<Post>('post-123')
 * const post = result.data
 *
 * // Query multiple posts
 * const result = await content.executeQuery<Post>({
 *   type: 'blogPost',
 *   filter: [{ field: 'fields.status', operator: '==', value: 'published' }],
 *   sort: [{ field: 'fields.publishDate', direction: 'desc' }],
 *   limit: 10
 * })
 * const posts = result.data
 * ```
 */
export const content = adapter

/**
 * Direct Contentful client for advanced use cases
 * Use sparingly - prefer the content service for CMS-agnostic code
 */
export { contentfulClient }

/**
 * Preview mode utilities
 */
export const preview = {
  isEnabled: isPreview,

  /**
   * Get preview URL for a specific entry
   */
  getPreviewUrl: (entryId: string, secret: string) => {
    return `/api/preview?secret=${secret}&id=${entryId}`
  },

  /**
   * Exit preview mode URL
   */
  exitUrl: '/api/exit-preview',
}
