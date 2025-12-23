/**
 * Basic Contentful Adapter Usage Example
 *
 * Demonstrates common patterns for working with the Contentful adapter
 */

import { createClient } from 'contentful'
import { createClient as createManagementClient } from 'contentful-management'
import { createContentfulAdapter } from '@contentbridge/contentful'
import type { BaseDocument } from '@contentbridge/core/types'

// ============================================================================
// Type Definitions
// ============================================================================

interface BlogPost extends BaseDocument {
  _type: 'blogPost'
  title: string
  slug: string
  excerpt?: string
  body: unknown // Rich text
  author: {
    _ref: string
  }
  publishDate: string
  featured: boolean
  tags: string[]
}

interface Author extends BaseDocument {
  _type: 'author'
  name: string
  bio: string
  avatar?: {
    _ref: string
  }
}

// ============================================================================
// Setup
// ============================================================================

async function setupAdapter() {
  // Create Contentful clients
  const deliveryClient = createClient({
    space: process.env.CONTENTFUL_SPACE_ID!,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN!,
    environment: process.env.CONTENTFUL_ENVIRONMENT || 'master',
  })

  // For write operations, also create management client
  const managementClient = await createManagementClient({
    accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN!,
  })

  // Create adapter
  const adapter = createContentfulAdapter({
    spaceId: process.env.CONTENTFUL_SPACE_ID!,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN!,
    managementToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN,
    deliveryClient,
    managementClient,
    defaultLocale: 'en-US',
    debug: true,
  })

  await adapter.initialize()

  return adapter
}

// ============================================================================
// Read Operations
// ============================================================================

async function queryExamples() {
  const adapter = await setupAdapter()

  // Example 1: Get all blog posts
  console.log('\n=== Example 1: Get All Posts ===')
  const allPosts = await adapter.executeQuery<BlogPost>({
    type: 'blogPost',
    limit: 10,
  })
  console.log(`Found ${allPosts.total} posts`)
  console.log('First post:', allPosts.data[0]?.title)

  // Example 2: Get featured posts
  console.log('\n=== Example 2: Get Featured Posts ===')
  const featuredPosts = await adapter.executeQuery<BlogPost>({
    type: 'blogPost',
    filter: [
      { field: 'featured', operator: '==', value: true },
    ],
    orderBy: [{ field: 'publishDate', direction: 'desc' }],
    limit: 5,
  })
  console.log(`Found ${featuredPosts.data.length} featured posts`)

  // Example 3: Search by title
  console.log('\n=== Example 3: Search Posts ===')
  const searchResults = await adapter.executeQuery<BlogPost>({
    type: 'blogPost',
    filter: [
      { field: 'title', operator: 'match', value: 'contentful' },
    ],
  })
  console.log(`Found ${searchResults.data.length} matching posts`)

  // Example 4: Get posts with specific tags
  console.log('\n=== Example 4: Posts with Tags ===')
  const taggedPosts = await adapter.executeQuery<BlogPost>({
    type: 'blogPost',
    filter: [
      { field: 'tags', operator: 'contains', value: 'javascript' },
    ],
  })
  console.log(`Found ${taggedPosts.data.length} JavaScript posts`)

  // Example 5: Get recent posts
  console.log('\n=== Example 5: Recent Posts ===')
  const recentPosts = await adapter.executeQuery<BlogPost>({
    type: 'blogPost',
    filter: [
      {
        field: 'publishDate',
        operator: '>=',
        value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
      },
    ],
    orderBy: [{ field: 'publishDate', direction: 'desc' }],
  })
  console.log(`Found ${recentPosts.data.length} recent posts`)

  // Example 6: Get by ID with references
  console.log('\n=== Example 6: Get by ID with References ===')
  if (allPosts.data[0]) {
    const postWithAuthor = await adapter.getById<BlogPost>(
      allPosts.data[0]._id,
      { resolveReferences: 1 }
    )
    console.log('Post:', postWithAuthor.data?.title)
    console.log('Author ref:', postWithAuthor.data?.author)
  }

  // Example 7: Count posts
  console.log('\n=== Example 7: Count Posts ===')
  const totalPosts = await adapter.count({
    type: 'blogPost',
  })
  console.log(`Total posts: ${totalPosts}`)

  const publishedCount = await adapter.count({
    type: 'blogPost',
    filter: [{ field: 'featured', operator: '==', value: true }],
  })
  console.log(`Featured posts: ${publishedCount}`)
}

// ============================================================================
// Write Operations
// ============================================================================

async function writeExamples() {
  const adapter = await setupAdapter()

  // Example 1: Create a new blog post
  console.log('\n=== Create New Post ===')
  const newPost = await adapter.create<BlogPost>('blogPost', {
    title: 'Getting Started with Contentful',
    slug: 'getting-started-with-contentful',
    excerpt: 'Learn how to use Contentful CMS effectively',
    body: {
      nodeType: 'document',
      data: {},
      content: [
        {
          nodeType: 'paragraph',
          data: {},
          content: [
            {
              nodeType: 'text',
              value: 'This is a complete guide to getting started with Contentful.',
              marks: [],
              data: {},
            },
          ],
        },
      ],
    },
    author: { _ref: 'author-id-here' },
    publishDate: new Date().toISOString(),
    featured: false,
    tags: ['contentful', 'cms', 'tutorial'],
  })
  console.log('Created post:', newPost._id, newPost.title)

  // Example 2: Update a post
  console.log('\n=== Update Post ===')
  const updated = await adapter.update<BlogPost>(newPost._id, {
    title: 'Getting Started with Contentful - Updated',
    featured: true,
  })
  console.log('Updated post:', updated.title, 'Featured:', updated.featured)

  // Example 3: Patch a post
  console.log('\n=== Patch Post ===')
  const patched = await adapter.patch<BlogPost>(newPost._id, [
    { op: 'set', path: 'excerpt', value: 'Updated excerpt' },
    { op: 'set', path: 'tags', value: ['contentful', 'cms', 'tutorial', 'beginner'] },
  ])
  console.log('Patched post tags:', patched.tags)

  // Example 4: Delete a post
  console.log('\n=== Delete Post ===')
  const deleted = await adapter.delete<BlogPost>(newPost._id)
  console.log('Deleted post:', deleted.title)
}

// ============================================================================
// Rich Text Examples
// ============================================================================

async function richTextExamples() {
  const adapter = await setupAdapter()

  console.log('\n=== Rich Text Conversion ===')

  // Contentful Rich Text format
  const contentfulRichText = {
    nodeType: 'document',
    data: {},
    content: [
      {
        nodeType: 'heading-1',
        data: {},
        content: [
          {
            nodeType: 'text',
            value: 'My Heading',
            marks: [],
            data: {},
          },
        ],
      },
      {
        nodeType: 'paragraph',
        data: {},
        content: [
          {
            nodeType: 'text',
            value: 'This is a paragraph with ',
            marks: [],
            data: {},
          },
          {
            nodeType: 'text',
            value: 'bold text',
            marks: [{ type: 'bold' }],
            data: {},
          },
          {
            nodeType: 'text',
            value: ' and ',
            marks: [],
            data: {},
          },
          {
            nodeType: 'text',
            value: 'italic text',
            marks: [{ type: 'italic' }],
            data: {},
          },
        ],
      },
      {
        nodeType: 'paragraph',
        data: {},
        content: [
          {
            nodeType: 'hyperlink',
            data: { uri: 'https://contentful.com' },
            content: [
              {
                nodeType: 'text',
                value: 'Visit Contentful',
                marks: [],
                data: {},
              },
            ],
          },
        ],
      },
    ],
  }

  // Convert to universal format
  const universal = await adapter.toUniversalRichText(contentfulRichText)
  console.log('Universal blocks:', JSON.stringify(universal, null, 2))

  // Convert back to Contentful format
  const backToContentful = await adapter.fromUniversalRichText(universal)
  console.log('Back to Contentful:', JSON.stringify(backToContentful, null, 2))
}

// ============================================================================
// Asset/Media Examples
// ============================================================================

async function assetExamples() {
  const adapter = await setupAdapter()

  console.log('\n=== Asset Management ===')

  const assetId = 'your-asset-id' // Replace with actual asset ID

  // Example 1: Get image URL
  const url = await adapter.resolveMediaUrl(assetId)
  console.log('Original URL:', url)

  // Example 2: Get optimized image URL
  const optimizedUrl = await adapter.resolveMediaUrl(assetId, {
    width: 800,
    height: 600,
    format: 'webp',
    quality: 85,
    fit: 'fill',
  })
  console.log('Optimized URL:', optimizedUrl)

  // Example 3: Generate responsive image set
  const imageSet = await adapter.getResponsiveImage(assetId, {
    widths: [400, 800, 1200, 1600],
    formats: ['webp', 'jpg'],
    quality: 85,
  })
  console.log('Image set:', imageSet)

  // Example 4: Get placeholder
  const placeholder = await adapter.getPlaceholder(assetId, {
    type: 'lqip',
    width: 20,
    quality: 10,
  })
  console.log('Placeholder URL:', placeholder)
}

// ============================================================================
// Run Examples
// ============================================================================

async function main() {
  try {
    // Read examples
    await queryExamples()

    // Write examples (comment out if you don't have management token)
    // await writeExamples()

    // Rich text examples
    await richTextExamples()

    // Asset examples
    // await assetExamples()

    console.log('\n✅ All examples completed successfully!')
  } catch (error) {
    console.error('Error running examples:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export {
  setupAdapter,
  queryExamples,
  writeExamples,
  richTextExamples,
  assetExamples,
}
