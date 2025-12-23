/**
 * Rich text types - Universal rich text abstraction
 *
 * These types provide a CMS-agnostic representation of rich text content,
 * abstracting away format-specific implementations:
 * - Sanity Portable Text
 * - Contentful Rich Text
 * - Payload Slate
 * - Strapi Blocks
 * - WordPress Gutenberg blocks
 *
 * The design follows Portable Text conventions as they're the most flexible,
 * while remaining compatible with transformation to/from other formats.
 */

// ============================================================================
// Core Block Types
// ============================================================================

/**
 * Block type discriminators
 * Defines the available block types in the rich text system
 */
export type BlockType =
  | 'block'        // Text block (paragraph, heading, etc.)
  | 'image'        // Image block
  | 'video'        // Video block
  | 'embed'        // Embedded content (iframe, social media, etc.)
  | 'code'         // Code block
  | 'quote'        // Blockquote
  | 'list'         // List container
  | 'listItem'     // Individual list item
  | 'table'        // Table block
  | 'tableRow'     // Table row
  | 'tableCell'    // Table cell
  | 'hr'           // Horizontal rule
  | 'custom'       // Custom block extension

/**
 * Block style variants for text blocks
 */
export type BlockStyle =
  | 'normal'       // Regular paragraph
  | 'h1'           // Heading level 1
  | 'h2'           // Heading level 2
  | 'h3'           // Heading level 3
  | 'h4'           // Heading level 4
  | 'h5'           // Heading level 5
  | 'h6'           // Heading level 6
  | 'blockquote'   // Blockquote
  | 'pre'          // Preformatted text

/**
 * List types
 */
export type ListType =
  | 'bullet'       // Unordered list
  | 'number'       // Ordered list
  | 'check'        // Checklist

/**
 * Text alignment options
 */
export type TextAlign = 'left' | 'center' | 'right' | 'justify'

// ============================================================================
// Base Block Interface
// ============================================================================

/**
 * Base interface for all block types
 * Every block must extend this interface
 */
export interface BaseBlock {
  /** Unique identifier for the block */
  _key: string
  /** Block type discriminator */
  _type: BlockType | string
  /** Custom metadata */
  metadata?: Record<string, unknown>
}

// ============================================================================
// Text Block (Paragraph, Headings)
// ============================================================================

/**
 * Text block containing spans of formatted text
 *
 * @example
 * ```typescript
 * {
 *   _key: 'block-1',
 *   _type: 'block',
 *   style: 'h1',
 *   children: [
 *     { _type: 'span', text: 'Hello ', marks: [] },
 *     { _type: 'span', text: 'World', marks: ['strong'] }
 *   ]
 * }
 * ```
 */
export interface TextBlock extends BaseBlock {
  _type: 'block'
  /** Block style (paragraph, heading, etc.) */
  style: BlockStyle
  /** Text content as spans */
  children: UniversalSpan[]
  /** List information if block is a list item */
  listItem?: ListType
  /** Nesting level for lists (0-based) */
  level?: number
  /** Text alignment */
  align?: TextAlign
  /** Custom attributes */
  [key: string]: unknown
}

// ============================================================================
// Spans (Inline Content)
// ============================================================================

/**
 * Mark type discriminators for inline formatting
 */
export type MarkType =
  | 'strong'       // Bold
  | 'em'           // Italic
  | 'code'         // Inline code
  | 'underline'    // Underline
  | 'strike'       // Strikethrough
  | 'highlight'    // Highlighted text
  | 'link'         // Hyperlink
  | 'sub'          // Subscript
  | 'sup'          // Superscript
  | string         // Custom marks

/**
 * Text span with formatting marks
 *
 * @example
 * ```typescript
 * // Plain text
 * { _type: 'span', text: 'Hello', marks: [] }
 *
 * // Bold text
 * { _type: 'span', text: 'Bold', marks: ['strong'] }
 *
 * // Link with formatting
 * {
 *   _type: 'span',
 *   text: 'Click here',
 *   marks: ['strong', 'link-abc123'],
 *   markDefs: [
 *     {
 *       _key: 'link-abc123',
 *       _type: 'link',
 *       href: 'https://example.com',
 *       target: '_blank'
 *     }
 *   ]
 * }
 * ```
 */
export interface UniversalSpan {
  _type: 'span'
  /** Raw text content */
  text: string
  /** Applied formatting marks */
  marks: string[]
  /** Mark definitions for complex marks (links, annotations) */
  markDefs?: MarkDefinition[]
}

/**
 * Definition for complex marks that need additional data
 */
export interface MarkDefinition {
  /** Unique identifier for this mark */
  _key: string
  /** Mark type */
  _type: MarkType
  /** Additional mark-specific properties */
  [key: string]: unknown
}

/**
 * Link mark definition
 */
export interface LinkMark extends MarkDefinition {
  _type: 'link'
  /** Link URL */
  href: string
  /** Link target (_blank, _self, etc.) */
  target?: string
  /** Link relationship */
  rel?: string
  /** Link title */
  title?: string
}

/**
 * Annotation mark for comments, highlights, etc.
 */
export interface AnnotationMark extends MarkDefinition {
  _type: 'annotation'
  /** Annotation text */
  content: string
  /** Author of annotation */
  author?: string
  /** Timestamp */
  timestamp?: string
}

// ============================================================================
// Media Blocks
// ============================================================================

/**
 * Image block with metadata and transformations
 *
 * @example
 * ```typescript
 * {
 *   _key: 'img-1',
 *   _type: 'image',
 *   asset: {
 *     _ref: 'image-abc123',
 *     url: 'https://cdn.example.com/image.jpg',
 *     metadata: {
 *       dimensions: { width: 1920, height: 1080 },
 *       lqip: 'data:image/jpeg;base64,...'
 *     }
 *   },
 *   alt: 'A beautiful landscape',
 *   caption: 'Sunset in the mountains'
 * }
 * ```
 */
export interface ImageBlock extends BaseBlock {
  _type: 'image'
  /** Image asset reference or data */
  asset: {
    _ref?: string
    url?: string
    metadata?: {
      dimensions?: { width: number; height: number }
      lqip?: string
      palette?: unknown
    }
  }
  /** Alternative text for accessibility */
  alt?: string
  /** Image caption */
  caption?: string | TextBlock[]
  /** Hotspot for focal point cropping */
  hotspot?: {
    x: number
    y: number
    width: number
    height: number
  }
  /** Crop coordinates */
  crop?: {
    top: number
    bottom: number
    left: number
    right: number
  }
  /** Custom attributes */
  [key: string]: unknown
}

/**
 * Video block for native video files
 *
 * @example
 * ```typescript
 * {
 *   _key: 'vid-1',
 *   _type: 'video',
 *   asset: {
 *     _ref: 'file-xyz789',
 *     url: 'https://cdn.example.com/video.mp4',
 *     mimeType: 'video/mp4'
 *   },
 *   poster: { url: 'https://cdn.example.com/thumb.jpg' },
 *   caption: 'Product demonstration'
 * }
 * ```
 */
export interface VideoBlock extends BaseBlock {
  _type: 'video'
  /** Video asset reference or data */
  asset: {
    _ref?: string
    url?: string
    mimeType?: string
    duration?: number
  }
  /** Video poster/thumbnail image */
  poster?: {
    url: string
    alt?: string
  }
  /** Video caption */
  caption?: string | TextBlock[]
  /** Autoplay flag */
  autoplay?: boolean
  /** Loop flag */
  loop?: boolean
  /** Muted flag */
  muted?: boolean
  /** Show controls */
  controls?: boolean
  /** Custom attributes */
  [key: string]: unknown
}

/**
 * Embed block for external content (YouTube, Vimeo, tweets, etc.)
 *
 * @example
 * ```typescript
 * // YouTube embed
 * {
 *   _key: 'embed-1',
 *   _type: 'embed',
 *   provider: 'youtube',
 *   url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
 *   embedCode: '<iframe src="..."></iframe>',
 *   title: 'Rick Astley - Never Gonna Give You Up'
 * }
 *
 * // Tweet embed
 * {
 *   _key: 'embed-2',
 *   _type: 'embed',
 *   provider: 'twitter',
 *   url: 'https://twitter.com/user/status/123456789',
 *   embedCode: '<blockquote>...</blockquote>'
 * }
 * ```
 */
export interface EmbedBlock extends BaseBlock {
  _type: 'embed'
  /** Embed provider (youtube, vimeo, twitter, etc.) */
  provider?: string
  /** Original URL */
  url: string
  /** Generated embed code (HTML) */
  embedCode?: string
  /** Embed title */
  title?: string
  /** Thumbnail URL */
  thumbnail?: string
  /** Aspect ratio (16:9, 4:3, etc.) */
  aspectRatio?: string
  /** Custom attributes */
  [key: string]: unknown
}

// ============================================================================
// Code Block
// ============================================================================

/**
 * Code block with syntax highlighting support
 *
 * @example
 * ```typescript
 * {
 *   _key: 'code-1',
 *   _type: 'code',
 *   language: 'typescript',
 *   code: 'const greeting = "Hello World";',
 *   filename: 'example.ts',
 *   highlightedLines: [1]
 * }
 * ```
 */
export interface CodeBlock extends BaseBlock {
  _type: 'code'
  /** Programming language for syntax highlighting */
  language?: string
  /** Raw code content */
  code: string
  /** Optional filename */
  filename?: string
  /** Line numbers to highlight */
  highlightedLines?: number[]
  /** Show line numbers */
  showLineNumbers?: boolean
  /** Caption or description */
  caption?: string
  /** Custom attributes */
  [key: string]: unknown
}

// ============================================================================
// Quote Block
// ============================================================================

/**
 * Blockquote with optional attribution
 *
 * @example
 * ```typescript
 * {
 *   _key: 'quote-1',
 *   _type: 'quote',
 *   content: [
 *     {
 *       _type: 'block',
 *       style: 'normal',
 *       children: [{ _type: 'span', text: 'To be or not to be', marks: [] }]
 *     }
 *   ],
 *   attribution: 'William Shakespeare',
 *   source: 'Hamlet'
 * }
 * ```
 */
export interface QuoteBlock extends BaseBlock {
  _type: 'quote'
  /** Quote content as rich text blocks */
  content: TextBlock[]
  /** Quote attribution/author */
  attribution?: string
  /** Source of the quote */
  source?: string
  /** URL to source */
  sourceUrl?: string
  /** Custom attributes */
  [key: string]: unknown
}

// ============================================================================
// List Blocks
// ============================================================================

/**
 * List container
 * Note: Many rich text systems represent lists as flat blocks with level/listItem properties
 * This nested structure is for systems that use explicit list containers
 */
export interface ListBlock extends BaseBlock {
  _type: 'list'
  /** List type */
  listType: ListType
  /** List items */
  items: ListItemBlock[]
  /** Custom attributes */
  [key: string]: unknown
}

/**
 * Individual list item
 */
export interface ListItemBlock extends BaseBlock {
  _type: 'listItem'
  /** Item content */
  content: TextBlock[]
  /** Nesting level (0-based) */
  level?: number
  /** Checked state for checklists */
  checked?: boolean
  /** Nested lists */
  children?: ListItemBlock[]
  /** Custom attributes */
  [key: string]: unknown
}

// ============================================================================
// Table Blocks
// ============================================================================

/**
 * Table block
 */
export interface TableBlock extends BaseBlock {
  _type: 'table'
  /** Table rows */
  rows: TableRowBlock[]
  /** Table caption */
  caption?: string
  /** Custom attributes */
  [key: string]: unknown
}

/**
 * Table row
 */
export interface TableRowBlock extends BaseBlock {
  _type: 'tableRow'
  /** Table cells */
  cells: TableCellBlock[]
  /** Custom attributes */
  [key: string]: unknown
}

/**
 * Table cell
 */
export interface TableCellBlock extends BaseBlock {
  _type: 'tableCell'
  /** Cell content */
  content: TextBlock[]
  /** Cell type (header or data) */
  cellType?: 'header' | 'data'
  /** Column span */
  colspan?: number
  /** Row span */
  rowspan?: number
  /** Custom attributes */
  [key: string]: unknown
}

// ============================================================================
// Horizontal Rule
// ============================================================================

/**
 * Horizontal rule / divider
 */
export interface HorizontalRuleBlock extends BaseBlock {
  _type: 'hr'
  /** Custom attributes */
  [key: string]: unknown
}

// ============================================================================
// Custom Block
// ============================================================================

/**
 * Custom block for extending the rich text system
 * Use this for CMS-specific or project-specific block types
 *
 * @example
 * ```typescript
 * // Call-to-action block
 * {
 *   _key: 'cta-1',
 *   _type: 'callToAction',
 *   title: 'Get Started Today',
 *   buttonText: 'Sign Up',
 *   buttonUrl: '/signup'
 * }
 *
 * // Product reference block
 * {
 *   _key: 'product-1',
 *   _type: 'productReference',
 *   productId: 'prod-123',
 *   layout: 'card'
 * }
 * ```
 */
export interface CustomBlock extends BaseBlock {
  _type: string
  /** Custom block data */
  [key: string]: unknown
}

// ============================================================================
// Union Types
// ============================================================================

/**
 * Union of all block types
 * This is the main type for rich text content
 */
export type UniversalBlock =
  | TextBlock
  | ImageBlock
  | VideoBlock
  | EmbedBlock
  | CodeBlock
  | QuoteBlock
  | ListBlock
  | ListItemBlock
  | TableBlock
  | TableRowBlock
  | TableCellBlock
  | HorizontalRuleBlock
  | CustomBlock

/**
 * Rich text content is an array of blocks
 */
export type RichTextContent = UniversalBlock[]

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a block is a text block
 */
export function isTextBlock(block: UniversalBlock): block is TextBlock {
  return block._type === 'block'
}

/**
 * Check if a block is an image block
 */
export function isImageBlock(block: UniversalBlock): block is ImageBlock {
  return block._type === 'image'
}

/**
 * Check if a block is a video block
 */
export function isVideoBlock(block: UniversalBlock): block is VideoBlock {
  return block._type === 'video'
}

/**
 * Check if a block is an embed block
 */
export function isEmbedBlock(block: UniversalBlock): block is EmbedBlock {
  return block._type === 'embed'
}

/**
 * Check if a block is a code block
 */
export function isCodeBlock(block: UniversalBlock): block is CodeBlock {
  return block._type === 'code'
}

/**
 * Check if a block is a quote block
 */
export function isQuoteBlock(block: UniversalBlock): block is QuoteBlock {
  return block._type === 'quote'
}

/**
 * Check if a block is a list block
 */
export function isListBlock(block: UniversalBlock): block is ListBlock {
  return block._type === 'list'
}

/**
 * Check if a block is a table block
 */
export function isTableBlock(block: UniversalBlock): block is TableBlock {
  return block._type === 'table'
}

/**
 * Check if a mark definition is a link
 */
export function isLinkMark(mark: MarkDefinition): mark is LinkMark {
  return mark._type === 'link'
}

/**
 * Check if a mark definition is an annotation
 */
export function isAnnotationMark(mark: MarkDefinition): mark is AnnotationMark {
  return mark._type === 'annotation'
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract all text content from rich text blocks
 * Useful for search indexing, previews, etc.
 */
export function extractTextContent(blocks: RichTextContent): string {
  return blocks
    .filter(isTextBlock)
    .flatMap(block => block.children)
    .map(span => span.text)
    .join(' ')
}

/**
 * Count words in rich text content
 */
export function countWords(blocks: RichTextContent): number {
  const text = extractTextContent(blocks)
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

/**
 * Get reading time estimate in minutes
 * Assumes average reading speed of 200 words per minute
 */
export function estimateReadingTime(blocks: RichTextContent, wordsPerMinute = 200): number {
  const words = countWords(blocks)
  return Math.ceil(words / wordsPerMinute)
}
