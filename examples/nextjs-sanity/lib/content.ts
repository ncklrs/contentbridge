/**
 * ContentBridge setup for Sanity CMS
 *
 * This file configures the ContentBridge client with Sanity adapter.
 * Use the `content` service throughout your application for all CMS operations.
 */

import { createSanityAdapter } from '@contentbridge/sanity'
import { createClient } from '@sanity/client'
import type { BaseAdapter } from '@contentbridge/core'

// Use placeholder values if real credentials aren't provided (allows build to succeed)
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'placeholder-project-id'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

// Sanity client configuration
const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: process.env.NODE_ENV === 'production',
  token: process.env.SANITY_API_TOKEN,
  perspective: 'published',
})

// Create ContentBridge adapter for Sanity
const adapter = createSanityAdapter(sanityClient, {
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: process.env.NODE_ENV === 'production',
  perspective: 'published',
})

/**
 * Main ContentBridge adapter instance
 *
 * Use this throughout your application:
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
 *   type: 'post',
 *   filter: [{ field: 'status', operator: '==', value: 'published' }],
 *   sort: [{ field: 'publishedAt', direction: 'desc' }],
 *   limit: 10
 * })
 * const posts = result.data
 * ```
 */
export const content = adapter

/**
 * Direct Sanity client for advanced use cases
 * Use sparingly - prefer the content service for CMS-agnostic code
 */
export { sanityClient }
