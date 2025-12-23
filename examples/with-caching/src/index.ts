/**
 * ContentBridge Caching Example
 *
 * Demonstrates different caching strategies with ContentBridge:
 * - Memory Cache: Fast in-memory caching
 * - Redis Cache: Distributed caching for production
 * - Next.js Integration: Using Next.js cache APIs
 *
 * NOTE: This example shows configuration patterns.
 * To run cache operations, you need a real Sanity project configured.
 */

import { createSanityAdapter } from '@contentbridge/sanity'
import { createClient } from '@sanity/client'
import 'dotenv/config'

// Use placeholder values for demonstration
const projectId = process.env.SANITY_PROJECT_ID || 'placeholder-project-id'
const dataset = process.env.SANITY_DATASET || 'production'

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})

const adapter = createSanityAdapter(client, {
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: false,
  perspective: 'published',
})

console.log('\n🎯 ContentBridge Caching Example\n')
console.log('This example demonstrates caching patterns with ContentBridge.')
console.log('To test caching, configure real CMS credentials in .env\n')

console.log('Available caching strategies:')
console.log('  1. Memory Cache - Fast in-memory caching')
console.log('  2. Redis Cache - Distributed caching')
console.log('  3. Next.js Cache - Integration with Next.js')
console.log('')
console.log('Example usage:')
console.log('')
console.log('  const post = await adapter.getById("post-id", {')
console.log('    cache: {')
console.log('      tags: ["post"],')
console.log('      ttl: 3600')
console.log('    }')
console.log('  })')
console.log('')
console.log('For full examples, see:')
console.log('  - src/cache/MemoryCache.ts')
console.log('  - README.md in this directory')
console.log('')
