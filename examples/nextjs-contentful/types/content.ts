/**
 * Type definitions for Contentful content models
 *
 * In production, generate these using:
 * - contentful-typescript-codegen
 * - @contentful/rich-text-types
 *
 * ContentBridge works seamlessly with Contentful's generated types.
 */

import type { BaseDocument } from '@contentbridge/core'

/**
 * Contentful Rich Text Document (simplified type for build)
 * In production, use @contentful/rich-text-types
 */
export interface RichTextDocument {
  nodeType: 'document'
  content: unknown[]
}

/**
 * Blog Post (Contentful content type: blogPost)
 */
export interface BlogPost extends BaseDocument {
  _type: 'blogPost'
  title: string
  slug: string
  excerpt?: string
  content?: RichTextDocument
  publishDate?: string
  featured?: boolean
  heroImage?: ContentfulAsset
  author?: BlogAuthor
  categories?: BlogCategory[]
  tags?: string[]
  seo?: SEOMetadata
}

/**
 * Blog Author (Contentful content type: blogAuthor)
 */
export interface BlogAuthor extends BaseDocument {
  _type: 'blogAuthor'
  name: string
  slug: string
  bio?: string
  avatar?: ContentfulAsset
  email?: string
  social?: {
    twitter?: string
    github?: string
    linkedin?: string
  }
}

/**
 * Blog Category (Contentful content type: blogCategory)
 */
export interface BlogCategory extends BaseDocument {
  _type: 'blogCategory'
  title: string
  slug: string
  description?: string
}

/**
 * SEO Metadata
 */
export interface SEOMetadata {
  title?: string
  description?: string
  keywords?: string[]
  ogImage?: ContentfulAsset
  noIndex?: boolean
}

/**
 * Contentful Asset
 *
 * Represents images, videos, PDFs, etc.
 */
export interface ContentfulAsset {
  sys: {
    id: string
    type: 'Asset'
    createdAt: string
    updatedAt: string
  }
  fields: {
    title?: string
    description?: string
    file: {
      url: string
      details: {
        size: number
        image?: {
          width: number
          height: number
        }
      }
      fileName: string
      contentType: string
    }
  }
}

/**
 * Contentful Reference
 *
 * Similar to Sanity references but with Contentful's structure
 */
export interface ContentfulReference<T = unknown> {
  sys: {
    type: 'Link'
    linkType: 'Entry' | 'Asset'
    id: string
  }
}
