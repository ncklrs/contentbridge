/**
 * ContentBridge setup with adapter switching
 *
 * This demonstrates how easy it is to switch between CMSs
 * using environment variables.
 */

import { createSanityAdapter, type SanityAdapter } from '@contentbridge/sanity'
import { createClient } from '@sanity/client'
import 'dotenv/config'

/**
 * Create ContentBridge adapter with Sanity
 */
export function createContent(): SanityAdapter {
  console.log('📦 Using Sanity adapter')

  const projectId = process.env.SANITY_PROJECT_ID || 'placeholder-project-id'
  const dataset = process.env.SANITY_DATASET || 'production'

  const sanityClient = createClient({
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    useCdn: false,
    token: process.env.SANITY_API_TOKEN,
  })

  return createSanityAdapter(sanityClient, {
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    useCdn: false,
    perspective: 'published',
  })
}

/**
 * Main ContentBridge service instance
 */
export const content = createContent()

/**
 * Get adapter name
 */
export function getAdapterName(): string {
  return 'sanity'
}
