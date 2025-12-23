/**
 * Type definitions for content models
 *
 * In a real application, these would be generated from your CMS schema.
 * For Sanity, use @sanity/codegen or sanity-codegen.
 * ContentBridge works seamlessly with generated types.
 */

import type { BaseDocument } from '@contentbridge/core'

/**
 * Blog Post
 */
export interface Post extends BaseDocument {
  _type: 'post'
  title: string
  slug: {
    _type: 'slug'
    current: string
  }
  excerpt?: string
  content?: PortableTextBlock[]
  publishedAt?: string
  featured?: boolean
  coverImage?: SanityImage
  author?: Reference<Author>
  categories?: Reference<Category>[]
  tags?: string[]
  seo?: SEO
}

/**
 * Author
 */
export interface Author extends BaseDocument {
  _type: 'author'
  name: string
  slug: {
    _type: 'slug'
    current: string
  }
  bio?: string
  image?: SanityImage
  email?: string
  social?: {
    twitter?: string
    github?: string
    linkedin?: string
  }
}

/**
 * Category
 */
export interface Category extends BaseDocument {
  _type: 'category'
  title: string
  slug: {
    _type: 'slug'
    current: string
  }
  description?: string
}

/**
 * SEO metadata
 */
export interface SEO {
  _type: 'seo'
  title?: string
  description?: string
  keywords?: string[]
  ogImage?: SanityImage
}

/**
 * Sanity Image
 */
export interface SanityImage {
  _type: 'image'
  asset: {
    _ref: string
    _type: 'reference'
  }
  crop?: {
    top: number
    bottom: number
    left: number
    right: number
  }
  hotspot?: {
    x: number
    y: number
    height: number
    width: number
  }
  alt?: string
}

/**
 * Portable Text block
 */
export interface PortableTextBlock {
  _type: 'block'
  _key: string
  style?: string
  children: PortableTextSpan[]
  markDefs?: PortableTextMarkDef[]
  level?: number
  listItem?: string
}

export interface PortableTextSpan {
  _type: 'span'
  _key: string
  text: string
  marks?: string[]
}

export interface PortableTextMarkDef {
  _type: string
  _key: string
  [key: string]: unknown
}

/**
 * Reference type helper
 */
export interface Reference<T extends BaseDocument = BaseDocument> {
  _type: 'reference'
  _ref: string
  _weak?: boolean
}
