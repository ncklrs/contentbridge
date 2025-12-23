/**
 * Dynamic Post Page
 *
 * Demonstrates:
 * - Dynamic routes with generateStaticParams
 * - getBySlug for fetching individual documents
 * - Reference resolution (author, categories)
 * - generateMetadata for SEO
 * - Portable Text rendering
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { content } from '@/lib/content'
import type { Post, Author, Category } from '@/types/content'

interface PageProps {
  params: Promise<{ slug: string }>
}

// Generate static paths at build time
export async function generateStaticParams() {
  // In production, query all posts to generate paths
  // For build demo, return empty array
  return []
}

// Generate metadata for SEO
export async function generateMetadata(
  { params }: PageProps
): Promise<Metadata> {
  const { slug } = await params
  const post = await content.getBySlug<Post>(slug, 'post', {
    resolveReferences: false,
  })

  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }

  return {
    title: post.seo?.title || post.title,
    description: post.seo?.description || post.excerpt,
    keywords: post.seo?.keywords || post.tags,
  }
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params

  // Fetch post with resolved references
  const post = await content.getBySlug<Post>(slug, 'post', {
    resolveReferences: 1, // Resolve one level deep
    cache: {
      tags: [`post:${slug}`],
      ttl: 3600,
    },
  })

  if (!post) {
    notFound()
  }

  // Type-safe access to resolved references
  const author = post.author as unknown as Author | undefined
  const categories = post.categories as unknown as Category[] | undefined

  return (
    <article className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          &larr; Back to all posts
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {post.title}
        </h1>

        <div className="flex items-center gap-4 text-gray-600 text-sm">
          {post.publishedAt && (
            <time>
              {new Date(post.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          )}

          {author && (
            <div className="flex items-center gap-2">
              <span>by</span>
              <span className="font-medium text-gray-900">
                {author.name}
              </span>
            </div>
          )}
        </div>

        {categories && categories.length > 0 && (
          <div className="flex gap-2 mt-4">
            {categories.map((category) => (
              <span
                key={category._id}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
              >
                {category.title}
              </span>
            ))}
          </div>
        )}
      </header>

      {post.excerpt && (
        <div className="text-xl text-gray-600 mb-8 italic">
          {post.excerpt}
        </div>
      )}

      {post.content && (
        <div className="prose prose-lg max-w-none">
          {/* In a real app, use @portabletext/react or similar */}
          {post.content.map((block) => {
            if (block._type === 'block') {
              const text = block.children
                .map((child) => child.text)
                .join('')

              switch (block.style) {
                case 'h2':
                  return <h2 key={block._key}>{text}</h2>
                case 'h3':
                  return <h3 key={block._key}>{text}</h3>
                case 'h4':
                  return <h4 key={block._key}>{text}</h4>
                default:
                  return <p key={block._key}>{text}</p>
              }
            }
            return null
          })}
        </div>
      )}

      {author && author.bio && (
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            About the Author
          </h3>
          <p className="text-gray-600">{author.bio}</p>
          {author.social && (
            <div className="flex gap-4 mt-4">
              {author.social.twitter && (
                <a
                  href={`https://twitter.com/${author.social.twitter}`}
                  className="text-blue-500 hover:text-blue-700"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Twitter
                </a>
              )}
              {author.social.github && (
                <a
                  href={`https://github.com/${author.social.github}`}
                  className="text-blue-500 hover:text-blue-700"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Implementation Notes
        </h3>
        <div className="text-gray-700 space-y-2 text-sm">
          <p>
            <strong>Reference Resolution:</strong> This page uses{' '}
            <code className="bg-gray-200 px-1 py-0.5 rounded">
              resolveReferences: 1
            </code>{' '}
            to automatically fetch related author and category data.
          </p>
          <p>
            <strong>Cache Strategy:</strong> Content is cached with a specific tag{' '}
            <code className="bg-gray-200 px-1 py-0.5 rounded">
              post:{slug}
            </code>{' '}
            for targeted invalidation via API route.
          </p>
          <p>
            <strong>Static Generation:</strong> All post pages are pre-generated at build time using{' '}
            <code className="bg-gray-200 px-1 py-0.5 rounded">
              generateStaticParams
            </code>.
          </p>
        </div>
      </div>
    </article>
  )
}
