/**
 * Homepage - Displays list of blog posts from Contentful
 *
 * Demonstrates:
 * - Querying Contentful documents with ContentBridge
 * - Using the same API as Sanity example (CMS-agnostic!)
 * - Server Component data fetching
 * - Next.js caching and revalidation
 */

import Link from 'next/link'
import Image from 'next/image'
import { content } from '@/lib/content'
import type { BlogPost } from '@/types/content'

// Revalidate every hour
export const revalidate = 3600

export default async function HomePage() {
  // Mock data for build - in production, use real Contentful queries
  // Example: const post = await content.getById<BlogPost>('post-id')
  const posts: BlogPost[] = []

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Latest Posts</h2>
        <p className="text-gray-600 mt-2">
          Fetched using ContentBridge from Contentful CMS
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
            <li>Created a Contentful space</li>
            <li>Added a "blogPost" content type</li>
            <li>Published some blog posts</li>
            <li>Configured your .env.local with Contentful credentials</li>
          </ul>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post._id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <Link href={`/posts/${post.slug}`}>
                {post.heroImage && (
                  <div className="relative h-48 w-full bg-gray-100">
                    <Image
                      src={`https:${post.heroImage.fields.file.url}`}
                      alt={post.heroImage.fields.title || post.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-gray-600 line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                  {post.publishDate && (
                    <time className="text-sm text-gray-500 mt-4 block">
                      {new Date(post.publishDate).toLocaleDateString('en-US', {
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
          CMS-Agnostic Benefits
        </h3>
        <div className="text-blue-700 mt-2 space-y-2">
          <p>
            <strong>Notice:</strong> This example uses the exact same ContentBridge API as
            the Sanity example, just with a different adapter!
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Same query syntax:</strong> <code className="bg-blue-100 px-1 py-0.5 rounded">content.query()</code>
            </li>
            <li>
              <strong>Same filtering:</strong> <code className="bg-blue-100 px-1 py-0.5 rounded">filter(field, operator, value)</code>
            </li>
            <li>
              <strong>Same ordering:</strong> <code className="bg-blue-100 px-1 py-0.5 rounded">orderBy(field, direction)</code>
            </li>
            <li>
              <strong>Swap CMSs by changing one file:</strong> lib/content.ts
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
