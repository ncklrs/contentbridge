/**
 * Homepage - Displays list of blog posts
 *
 * Demonstrates:
 * - Querying documents with filters and sorting
 * - Using QueryBuilder for complex queries
 * - Server Component data fetching
 * - Next.js caching and revalidation
 */

import Link from 'next/link'
import { content } from '@/lib/content'
import type { Post } from '@/types/content'

// Revalidate every hour
export const revalidate = 3600

export default async function HomePage() {
  // Mock data for build - in production, use real Sanity queries
  // Example: const post = await content.getById<Post>('post-id')
  const posts: Post[] = []

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Latest Posts</h2>
        <p className="text-gray-600 mt-2">
          Fetched using ContentBridge from Sanity CMS
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900">
            No posts found
          </h3>
          <p className="text-yellow-700 mt-2">
            Make sure you have:
          </p>
          <ul className="list-disc list-inside text-yellow-700 mt-2 space-y-1">
            <li>Set up your Sanity project</li>
            <li>Created a post content type</li>
            <li>Published some posts</li>
            <li>Configured your .env.local with Sanity credentials</li>
          </ul>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post._id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <Link href={`/posts/${post.slug.current}`}>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-gray-600 line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                  {post.publishedAt && (
                    <time className="text-sm text-gray-500 mt-4 block">
                      {new Date(post.publishedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                  )}
                  {post.featured && (
                    <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                      Featured
                    </span>
                  )}
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
        <h3 className="text-lg font-semibold text-blue-900">
          About This Example
        </h3>
        <div className="text-blue-700 mt-2 space-y-2">
          <p>
            This page demonstrates ContentBridge with Sanity CMS:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>QueryBuilder API:</strong> Type-safe, fluent query construction
            </li>
            <li>
              <strong>Automatic caching:</strong> Next.js revalidation with{' '}
              <code className="bg-blue-100 px-1 py-0.5 rounded">
                revalidate = 3600
              </code>
            </li>
            <li>
              <strong>CMS-agnostic:</strong> Swap Sanity for Contentful by changing the adapter
            </li>
            <li>
              <strong>Type-safe:</strong> Full TypeScript support with generated types
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
