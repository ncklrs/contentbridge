/**
 * ContentBridge Basic Node.js Example
 *
 * Demonstrates basic CRUD operations with ContentBridge:
 * - CREATE: Creating new documents
 * - READ: Fetching documents by ID and slug
 * - UPDATE: Updating existing documents
 * - DELETE: Removing documents
 */

import { content, getAdapterName } from './content.js'

interface Post {
  _id: string
  _type: string
  _createdAt?: string
  _updatedAt?: string
  _rev?: string
  title: string
  slug: { _type: 'slug'; current: string }
  content?: string
  publishedAt?: string
  status?: 'draft' | 'published'
  views?: number
  tags?: string[]
}

async function main() {
  console.log('\n🚀 ContentBridge Basic Node.js Example')
  console.log(`📦 Using: ${getAdapterName()} adapter\n`)

  try {
    // ========================================================================
    // CREATE - Create a new document
    // ========================================================================
    console.log('━━━ CREATE ━━━')

    const newPost = await content.create<Post>({
      _type: 'post',
      title: 'Getting Started with ContentBridge',
      slug: {
        _type: 'slug',
        current: 'getting-started-contentbridge',
      },
      content: 'ContentBridge makes it easy to work with any CMS...',
      status: 'draft',
      views: 0,
      tags: ['tutorial', 'getting-started'],
    })

    console.log(`✅ Created post: ${newPost.title}`)
    console.log(`   ID: ${newPost._id}\n`)

    // ========================================================================
    // READ - Get by ID and slug
    // ========================================================================
    console.log('━━━ READ ━━━')

    // Get by ID
    const post = await content.getById<Post>(newPost._id)
    console.log('✅ Fetched by ID:', post?.title)

    // Get by slug
    const postBySlug = await content.getBySlug<Post>(
      'getting-started-contentbridge',
      'post'
    )
    console.log('✅ Fetched by slug:', postBySlug?.title)

    // Check existence
    const exists = await content.exists(newPost._id)
    console.log(`✅ Document exists: ${exists}\n`)

    // ========================================================================
    // UPDATE - Update existing document
    // ========================================================================
    console.log('━━━ UPDATE ━━━')

    const updatedPost = await content.update<Post>(newPost._id, {
      _id: newPost._id,
      _type: 'post',
      status: 'published',
      publishedAt: new Date().toISOString(),
      views: 100,
    })

    console.log(`✅ Updated post: ${updatedPost.title}`)
    console.log(`   Status: ${updatedPost.status}`)
    console.log(`   Views: ${updatedPost.views}\n`)

    // ========================================================================
    // PATCH - Patch specific fields
    // ========================================================================
    console.log('━━━ PATCH ━━━')

    const patchedPost = await content.patch<Post>(newPost._id, [
      { op: 'set', path: 'views', value: 150 },
      { op: 'set', path: 'tags', value: ['tutorial', 'getting-started', 'beginner'] },
    ])

    console.log(`✅ Patched post views: ${patchedPost.views}`)
    console.log(`   Tags: ${patchedPost.tags?.join(', ')}\n`)

    // ========================================================================
    // DELETE - Remove document
    // ========================================================================
    console.log('━━━ DELETE ━━━')

    await content.delete(newPost._id)
    console.log(`✅ Deleted post: ${newPost._id}`)

    // Verify deletion
    const deletedExists = await content.exists(newPost._id)
    console.log(`   Still exists: ${deletedExists}\n`)

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✨ All operations completed successfully!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

main()
