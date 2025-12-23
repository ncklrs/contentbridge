/**
 * Test data fixtures for ContentBridge tests
 *
 * Provides reusable test documents and data structures
 * for consistent testing across the codebase.
 */

import type { BaseDocument, Slug, DocumentReference } from '../types/document'
import type { RichTextContent, UniversalBlock } from '../types/richtext'
import type { MediaAsset } from '../types/media'

// ============================================================================
// Document Fixtures
// ============================================================================

/**
 * Post document type for testing
 */
export interface Post extends BaseDocument {
  _type: 'post'
  title: string
  slug: Slug
  content: RichTextContent
  excerpt?: string
  publishedAt?: string
  author?: DocumentReference<'author'>
  featured: boolean
  views: number
  tags: string[]
  status: 'draft' | 'published' | 'archived'
  image?: MediaAsset
}

/**
 * Author document type for testing
 */
export interface Author extends BaseDocument {
  _type: 'author'
  name: string
  email: string
  bio?: RichTextContent
  avatar?: MediaAsset
  slug: Slug
}

/**
 * Category document type for testing
 */
export interface Category extends BaseDocument {
  _type: 'category'
  name: string
  slug: Slug
  description?: string
  parent?: DocumentReference<'category'>
}

// ============================================================================
// Sample Documents
// ============================================================================

export const sampleAuthor: Author = {
  _id: 'author-123',
  _type: 'author',
  _createdAt: '2024-01-01T00:00:00Z',
  _updatedAt: '2024-01-01T00:00:00Z',
  name: 'John Doe',
  email: 'john@example.com',
  slug: {
    _type: 'slug',
    current: 'john-doe',
  },
}

export const samplePost: Post = {
  _id: 'post-456',
  _type: 'post',
  _createdAt: '2024-01-02T00:00:00Z',
  _updatedAt: '2024-01-02T00:00:00Z',
  title: 'Hello World',
  slug: {
    _type: 'slug',
    current: 'hello-world',
  },
  content: [
    {
      _type: 'block',
      _key: 'block-1',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 'span-1',
          text: 'This is a sample blog post.',
          marks: [],
        },
      ],
    },
  ],
  excerpt: 'A sample blog post for testing',
  publishedAt: '2024-01-02T10:00:00Z',
  author: {
    _ref: 'author-123',
    _type: 'reference',
    _targetType: 'author',
  },
  featured: false,
  views: 0,
  tags: ['testing', 'sample'],
  status: 'published',
}

export const sampleDraftPost: Post = {
  _id: 'post-789',
  _type: 'post',
  _createdAt: '2024-01-03T00:00:00Z',
  _updatedAt: '2024-01-03T00:00:00Z',
  title: 'Draft Post',
  slug: {
    _type: 'slug',
    current: 'draft-post',
  },
  content: [],
  featured: false,
  views: 0,
  tags: [],
  status: 'draft',
}

export const sampleCategory: Category = {
  _id: 'category-999',
  _type: 'category',
  _createdAt: '2024-01-01T00:00:00Z',
  _updatedAt: '2024-01-01T00:00:00Z',
  name: 'Technology',
  slug: {
    _type: 'slug',
    current: 'technology',
  },
  description: 'Articles about technology',
}

// ============================================================================
// Rich Text Fixtures
// ============================================================================

export const sampleRichTextBlocks: UniversalBlock[] = [
  {
    _type: 'block',
    _key: 'block-1',
    style: 'h1',
    children: [
      {
        _type: 'span',
        _key: 'span-1',
        text: 'Main Heading',
        marks: [],
      },
    ],
  },
  {
    _type: 'block',
    _key: 'block-2',
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: 'span-2',
        text: 'This is a paragraph with ',
        marks: [],
      },
      {
        _type: 'span',
        _key: 'span-3',
        text: 'bold text',
        marks: ['strong'],
      },
      {
        _type: 'span',
        _key: 'span-4',
        text: ' and ',
        marks: [],
      },
      {
        _type: 'span',
        _key: 'span-5',
        text: 'italic text',
        marks: ['em'],
      },
      {
        _type: 'span',
        _key: 'span-6',
        text: '.',
        marks: [],
      },
    ],
  },
  {
    _type: 'block',
    _key: 'block-3',
    style: 'normal',
    listItem: 'bullet',
    children: [
      {
        _type: 'span',
        _key: 'span-7',
        text: 'First bullet point',
        marks: [],
      },
    ],
  },
  {
    _type: 'block',
    _key: 'block-4',
    style: 'normal',
    listItem: 'bullet',
    children: [
      {
        _type: 'span',
        _key: 'span-8',
        text: 'Second bullet point',
        marks: [],
      },
    ],
  },
]

export const sampleRichTextContent: RichTextContent = sampleRichTextBlocks

// ============================================================================
// Media Fixtures
// ============================================================================

export const sampleImage: MediaAsset = {
  _type: 'image',
  asset: {
    _ref: 'image-asset-123',
    _type: 'reference',
  },
  alt: 'Sample image',
  hotspot: {
    x: 0.5,
    y: 0.5,
    height: 0.8,
    width: 0.8,
  },
  crop: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a test post with custom properties
 */
export function createTestPost(overrides?: Partial<Post>): Post {
  return {
    ...samplePost,
    _id: `post-${Math.random().toString(36).substr(2, 9)}`,
    _createdAt: new Date().toISOString(),
    _updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create a test author with custom properties
 */
export function createTestAuthor(overrides?: Partial<Author>): Author {
  return {
    ...sampleAuthor,
    _id: `author-${Math.random().toString(36).substr(2, 9)}`,
    _createdAt: new Date().toISOString(),
    _updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create a test category with custom properties
 */
export function createTestCategory(overrides?: Partial<Category>): Category {
  return {
    ...sampleCategory,
    _id: `category-${Math.random().toString(36).substr(2, 9)}`,
    _createdAt: new Date().toISOString(),
    _updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create multiple test posts
 */
export function createTestPosts(count: number, overrides?: Partial<Post>): Post[] {
  return Array.from({ length: count }, (_, i) =>
    createTestPost({
      title: `Test Post ${i + 1}`,
      slug: {
        _type: 'slug',
        current: `test-post-${i + 1}`,
      },
      ...overrides,
    })
  )
}

/**
 * Create a document reference
 */
export function createReference<T extends string = string>(
  id: string,
  targetType?: T
): DocumentReference<T> {
  return {
    _ref: id,
    _type: 'reference',
    ...(targetType && { _targetType: targetType }),
  }
}

/**
 * Create a slug
 */
export function createSlug(current: string): Slug {
  return {
    _type: 'slug',
    current,
  }
}
