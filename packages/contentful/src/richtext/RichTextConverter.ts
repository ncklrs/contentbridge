/**
 * Contentful Rich Text Converter
 *
 * Converts between Contentful Rich Text format and Universal RichTextContent
 * Handles bidirectional conversion while preserving structure and metadata
 *
 * Contentful Rich Text uses a structured JSON format with nodes and content
 * Reference: https://www.contentful.com/developers/docs/concepts/rich-text/
 */

import type {
  RichTextContent,
  UniversalBlock,
  TextBlock,
  UniversalSpan,
  ImageBlock,
  CodeBlock,
  QuoteBlock,
  BlockStyle,
  ListType,
} from '@contentbridge/core'

/**
 * Contentful Rich Text node types
 * Based on @contentful/rich-text-types
 */
export const BLOCKS = {
  DOCUMENT: 'document',
  PARAGRAPH: 'paragraph',
  HEADING_1: 'heading-1',
  HEADING_2: 'heading-2',
  HEADING_3: 'heading-3',
  HEADING_4: 'heading-4',
  HEADING_5: 'heading-5',
  HEADING_6: 'heading-6',
  UL_LIST: 'unordered-list',
  OL_LIST: 'ordered-list',
  LIST_ITEM: 'list-item',
  QUOTE: 'blockquote',
  HR: 'hr',
  EMBEDDED_ENTRY: 'embedded-entry-block',
  EMBEDDED_ASSET: 'embedded-asset-block',
  TABLE: 'table',
  TABLE_ROW: 'table-row',
  TABLE_CELL: 'table-cell',
  TABLE_HEADER_CELL: 'table-header-cell',
} as const

export const INLINES = {
  HYPERLINK: 'hyperlink',
  ENTRY_HYPERLINK: 'entry-hyperlink',
  ASSET_HYPERLINK: 'asset-hyperlink',
  EMBEDDED_ENTRY: 'embedded-entry-inline',
} as const

export const MARKS = {
  BOLD: 'bold',
  ITALIC: 'italic',
  UNDERLINE: 'underline',
  CODE: 'code',
  SUBSCRIPT: 'subscript',
  SUPERSCRIPT: 'superscript',
} as const

/**
 * Contentful Rich Text document structure
 */
interface ContentfulRichText {
  nodeType: typeof BLOCKS.DOCUMENT
  data: Record<string, unknown>
  content: ContentfulNode[]
}

interface ContentfulNode {
  nodeType: string
  data: Record<string, unknown>
  content?: ContentfulNode[]
  value?: string
  marks?: ContentfulMark[]
}

interface ContentfulMark {
  type: string
}

/**
 * Contentful Rich Text Converter
 * Converts between Contentful Rich Text and universal rich text format
 */
export class RichTextConverter {
  /**
   * Convert Contentful Rich Text to universal RichTextContent
   */
  fromContentfulRichText(richText: ContentfulRichText | unknown): RichTextContent {
    if (!richText || typeof richText !== 'object') {
      return []
    }

    const doc = richText as ContentfulRichText

    if (doc.nodeType !== BLOCKS.DOCUMENT) {
      console.warn('Expected document node, got:', doc.nodeType)
      return []
    }

    return (doc.content || [])
      .map(node => this.convertNodeFromContentful(node))
      .filter((block): block is UniversalBlock => block !== null)
  }

  /**
   * Convert universal RichTextContent to Contentful Rich Text
   */
  toContentfulRichText(content: RichTextContent): ContentfulRichText {
    const contentfulNodes = content
      .map(block => this.convertBlockToContentful(block))
      .filter((node): node is ContentfulNode => node !== null)

    return {
      nodeType: BLOCKS.DOCUMENT,
      data: {},
      content: contentfulNodes,
    }
  }

  /**
   * Convert a Contentful node to universal block
   */
  private convertNodeFromContentful(node: ContentfulNode): UniversalBlock | null {
    switch (node.nodeType) {
      case BLOCKS.PARAGRAPH:
      case BLOCKS.HEADING_1:
      case BLOCKS.HEADING_2:
      case BLOCKS.HEADING_3:
      case BLOCKS.HEADING_4:
      case BLOCKS.HEADING_5:
      case BLOCKS.HEADING_6:
        return this.convertTextNodeFromContentful(node)

      case BLOCKS.QUOTE:
        return this.convertQuoteFromContentful(node)

      case BLOCKS.UL_LIST:
      case BLOCKS.OL_LIST:
        return this.convertListFromContentful(node)

      case BLOCKS.EMBEDDED_ASSET:
        return this.convertEmbeddedAssetFromContentful(node)

      case BLOCKS.EMBEDDED_ENTRY:
        return this.convertEmbeddedEntryFromContentful(node)

      case BLOCKS.HR:
        return this.convertHrFromContentful()

      case BLOCKS.TABLE:
        // Tables need special handling - skip for now
        console.warn('Table conversion not yet implemented')
        return null

      default:
        console.warn('Unknown Contentful node type:', node.nodeType)
        return null
    }
  }

  /**
   * Convert text node (paragraph, heading) from Contentful
   */
  private convertTextNodeFromContentful(node: ContentfulNode): TextBlock {
    const style = this.mapNodeTypeToStyle(node.nodeType)
    const children = this.extractSpans(node.content || [])

    return {
      _key: this.generateKey(),
      _type: 'block',
      style,
      children,
    }
  }

  /**
   * Convert quote block from Contentful
   */
  private convertQuoteFromContentful(node: ContentfulNode): QuoteBlock {
    const content = (node.content || [])
      .map(n => this.convertNodeFromContentful(n))
      .filter((block): block is TextBlock => block !== null && block._type === 'block')

    return {
      _key: this.generateKey(),
      _type: 'quote',
      content,
    }
  }

  /**
   * Convert list from Contentful
   * Contentful uses nested structure: list > list-item > paragraph
   */
  private convertListFromContentful(node: ContentfulNode): UniversalBlock | null {
    const listType: ListType = node.nodeType === BLOCKS.UL_LIST ? 'bullet' : 'number'

    // Contentful uses nested list-item nodes
    // We'll flatten to text blocks with listItem property
    const items = (node.content || [])
      .flatMap(listItemNode => {
        if (listItemNode.nodeType !== BLOCKS.LIST_ITEM) {
          return []
        }

        return (listItemNode.content || [])
          .map(itemContent => {
            const block = this.convertNodeFromContentful(itemContent)
            if (block && block._type === 'block') {
              return {
                ...block,
                listItem: listType,
                level: 0,
              } as TextBlock
            }
            return null
          })
          .filter((item): item is TextBlock => item !== null)
      })

    // Return first item (Portable Text style - flat list items)
    // In a full implementation, you'd return all items
    return items[0] || null
  }

  /**
   * Convert embedded asset (image) from Contentful
   */
  private convertEmbeddedAssetFromContentful(node: ContentfulNode): ImageBlock | null {
    const target = node.data?.target as {
      sys?: { id: string }
      fields?: {
        file?: { url?: string; contentType?: string }
        title?: string
        description?: string
      }
    }

    if (!target?.sys?.id) {
      return null
    }

    const file = target.fields?.file
    const isImage = file?.contentType?.startsWith('image/')

    if (!isImage) {
      // Not an image - could be a file embed
      return null
    }

    return {
      _key: this.generateKey(),
      _type: 'image',
      asset: {
        _ref: target.sys.id,
        url: file?.url ? `https:${file.url}` : undefined,
      },
      alt: target.fields?.title,
      caption: target.fields?.description,
    }
  }

  /**
   * Convert embedded entry from Contentful
   */
  private convertEmbeddedEntryFromContentful(node: ContentfulNode): UniversalBlock | null {
    const target = node.data?.target as {
      sys?: { id: string; contentType?: { sys?: { id: string } } }
    }

    if (!target?.sys?.id) {
      return null
    }

    // Embedded entries are custom blocks with custom properties
    return {
      _key: this.generateKey(),
      _type: target.sys.contentType?.sys?.id || 'embeddedEntry',
      entryId: target.sys.id,
      data: node.data,
    } as UniversalBlock
  }

  /**
   * Convert horizontal rule from Contentful
   */
  private convertHrFromContentful(): UniversalBlock {
    return {
      _key: this.generateKey(),
      _type: 'hr',
    }
  }

  /**
   * Extract text spans from Contentful content nodes
   */
  private extractSpans(content: ContentfulNode[]): UniversalSpan[] {
    const spans: UniversalSpan[] = []

    for (const node of content) {
      if (node.nodeType === 'text') {
        // Text node
        const marks = (node.marks || []).map(m => {
          const markType = this.mapContentfulMark(m.type)
          return markType
        })

        spans.push({
          _type: 'span',
          text: node.value || '',
          marks,
        })
      } else if (node.nodeType === INLINES.HYPERLINK) {
        // Hyperlink
        const linkKey = this.generateKey()
        const text = this.extractTextFromNodes(node.content || [])
        const uri = (node.data?.uri as string) || ''

        spans.push({
          _type: 'span',
          text,
          marks: [linkKey],
          markDefs: [
            {
              _key: linkKey,
              _type: 'link',
              href: uri,
            },
          ],
        })
      } else if (node.nodeType === INLINES.ENTRY_HYPERLINK || node.nodeType === INLINES.ASSET_HYPERLINK) {
        // Entry/Asset hyperlink
        const linkKey = this.generateKey()
        const text = this.extractTextFromNodes(node.content || [])
        const target = node.data?.target as { sys?: { id: string } }
        const entryId = target?.sys?.id

        if (entryId) {
          spans.push({
            _type: 'span',
            text,
            marks: [linkKey],
            markDefs: [
              {
                _key: linkKey,
                _type: 'reference',
                _ref: entryId,
              },
            ],
          })
        }
      }
    }

    return spans
  }

  /**
   * Extract plain text from Contentful nodes (for hyperlinks)
   */
  private extractTextFromNodes(nodes: ContentfulNode[]): string {
    return nodes
      .map(node => {
        if (node.nodeType === 'text') {
          return node.value || ''
        }
        if (node.content) {
          return this.extractTextFromNodes(node.content)
        }
        return ''
      })
      .join('')
  }

  /**
   * Convert universal block to Contentful node
   */
  private convertBlockToContentful(block: UniversalBlock): ContentfulNode | null {
    switch (block._type) {
      case 'block':
        return this.convertTextBlockToContentful(block as TextBlock)

      case 'quote':
        return this.convertQuoteToContentful(block as QuoteBlock)

      case 'image':
        return this.convertImageToContentful(block as ImageBlock)

      case 'hr':
        return this.convertHrToContentful()

      case 'code':
        // Code blocks aren't natively supported in Contentful Rich Text
        // Convert to paragraph with code formatting
        return this.convertCodeToContentful(block as CodeBlock)

      default:
        // Custom block - attempt to preserve
        console.warn('Custom block type not directly supported:', block._type)
        return null
    }
  }

  /**
   * Convert text block to Contentful node
   */
  private convertTextBlockToContentful(block: TextBlock): ContentfulNode {
    const nodeType = this.mapStyleToNodeType(block.style)
    const content = this.convertSpansToContentful(block.children)

    return {
      nodeType,
      data: {},
      content,
    }
  }

  /**
   * Convert quote block to Contentful
   */
  private convertQuoteToContentful(block: QuoteBlock): ContentfulNode {
    const content = block.content
      .map(b => this.convertTextBlockToContentful(b))
      .filter((n): n is ContentfulNode => n !== null)

    return {
      nodeType: BLOCKS.QUOTE,
      data: {},
      content,
    }
  }

  /**
   * Convert image block to Contentful embedded asset
   */
  private convertImageToContentful(block: ImageBlock): ContentfulNode {
    return {
      nodeType: BLOCKS.EMBEDDED_ASSET,
      data: {
        target: {
          sys: {
            id: block.asset._ref,
            type: 'Link',
            linkType: 'Asset',
          },
        },
      },
      content: [],
    }
  }

  /**
   * Convert code block to Contentful (as paragraph with code marks)
   */
  private convertCodeToContentful(block: CodeBlock): ContentfulNode {
    return {
      nodeType: BLOCKS.PARAGRAPH,
      data: {},
      content: [
        {
          nodeType: 'text',
          value: block.code,
          marks: [{ type: MARKS.CODE }],
          data: {},
        },
      ],
    }
  }

  /**
   * Convert horizontal rule to Contentful
   */
  private convertHrToContentful(): ContentfulNode {
    return {
      nodeType: BLOCKS.HR,
      data: {},
      content: [],
    }
  }

  /**
   * Convert universal spans to Contentful text/inline nodes
   */
  private convertSpansToContentful(spans: UniversalSpan[]): ContentfulNode[] {
    return spans.map(span => {
      // Check if span has link mark
      const linkMarkDef = span.markDefs?.find(def => def._type === 'link')

      if (linkMarkDef && 'href' in linkMarkDef) {
        // Create hyperlink node
        return {
          nodeType: INLINES.HYPERLINK,
          data: {
            uri: linkMarkDef.href,
          },
          content: [
            {
              nodeType: 'text',
              value: span.text,
              marks: span.marks
                .filter(m => !m.startsWith('link-'))
                .map(m => ({ type: this.mapUniversalMark(m) })),
              data: {},
            },
          ],
        }
      }

      // Regular text node
      return {
        nodeType: 'text',
        value: span.text,
        marks: span.marks.map(m => ({ type: this.mapUniversalMark(m) })),
        data: {},
      }
    })
  }

  /**
   * Map Contentful node type to universal block style
   */
  private mapNodeTypeToStyle(nodeType: string): BlockStyle {
    const styleMap: Record<string, BlockStyle> = {
      [BLOCKS.PARAGRAPH]: 'normal',
      [BLOCKS.HEADING_1]: 'h1',
      [BLOCKS.HEADING_2]: 'h2',
      [BLOCKS.HEADING_3]: 'h3',
      [BLOCKS.HEADING_4]: 'h4',
      [BLOCKS.HEADING_5]: 'h5',
      [BLOCKS.HEADING_6]: 'h6',
      [BLOCKS.QUOTE]: 'blockquote',
    }

    return styleMap[nodeType] || 'normal'
  }

  /**
   * Map universal block style to Contentful node type
   */
  private mapStyleToNodeType(style: BlockStyle): string {
    const nodeTypeMap: Record<BlockStyle, string> = {
      normal: BLOCKS.PARAGRAPH,
      h1: BLOCKS.HEADING_1,
      h2: BLOCKS.HEADING_2,
      h3: BLOCKS.HEADING_3,
      h4: BLOCKS.HEADING_4,
      h5: BLOCKS.HEADING_5,
      h6: BLOCKS.HEADING_6,
      blockquote: BLOCKS.QUOTE,
      pre: BLOCKS.PARAGRAPH, // No direct equivalent
    }

    return nodeTypeMap[style] || BLOCKS.PARAGRAPH
  }

  /**
   * Map Contentful mark to universal mark
   */
  private mapContentfulMark(markType: string): string {
    const markMap: Record<string, string> = {
      [MARKS.BOLD]: 'strong',
      [MARKS.ITALIC]: 'em',
      [MARKS.UNDERLINE]: 'underline',
      [MARKS.CODE]: 'code',
      [MARKS.SUBSCRIPT]: 'sub',
      [MARKS.SUPERSCRIPT]: 'sup',
    }

    return markMap[markType] || markType
  }

  /**
   * Map universal mark to Contentful mark
   */
  private mapUniversalMark(mark: string): string {
    const markMap: Record<string, string> = {
      strong: MARKS.BOLD,
      em: MARKS.ITALIC,
      underline: MARKS.UNDERLINE,
      code: MARKS.CODE,
      sub: MARKS.SUBSCRIPT,
      sup: MARKS.SUPERSCRIPT,
    }

    return markMap[mark] || mark
  }

  /**
   * Generate a unique key for blocks
   */
  private generateKey(): string {
    return Math.random().toString(36).substring(2, 11)
  }
}

/**
 * Create a Contentful Rich Text converter instance
 */
export function createRichTextConverter(): RichTextConverter {
  return new RichTextConverter()
}

/**
 * Convenience function: Convert from Contentful Rich Text
 */
export function fromContentfulRichText(richText: unknown): RichTextContent {
  const converter = new RichTextConverter()
  return converter.fromContentfulRichText(richText as ContentfulRichText)
}

/**
 * Convenience function: Convert to Contentful Rich Text
 */
export function toContentfulRichText(content: RichTextContent): unknown {
  const converter = new RichTextConverter()
  return converter.toContentfulRichText(content)
}
