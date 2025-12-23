/**
 * Strapi Blocks Converter
 *
 * Converts between Strapi Blocks (v5 rich text editor) and Universal RichTextContent
 * Handles bidirectional conversion while preserving structure and metadata
 *
 * Strapi Blocks format is similar to Slate.js and uses a hierarchical structure
 * with nodes that have type, children, and optional formatting properties
 */

import type {
  RichTextContent,
  UniversalBlock,
  TextBlock,
  UniversalSpan,
  ImageBlock,
  CodeBlock,
  QuoteBlock,
  ListBlock,
  ListItemBlock,
  BaseBlock,
  BlockStyle,
  ListType,
} from '@contentbridge/core'

/**
 * Strapi Blocks types
 * These match Strapi v5's Blocks editor structure
 */
interface StrapiBlockNode {
  type: string
  children?: StrapiBlockNode[]
  [key: string]: unknown
}

interface StrapiTextNode extends StrapiBlockNode {
  type: 'text'
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
}

interface StrapiParagraphNode extends StrapiBlockNode {
  type: 'paragraph'
  children: StrapiInlineNode[]
}

interface StrapiHeadingNode extends StrapiBlockNode {
  type: 'heading'
  level: 1 | 2 | 3 | 4 | 5 | 6
  children: StrapiInlineNode[]
}

interface StrapiListNode extends StrapiBlockNode {
  type: 'list'
  format: 'ordered' | 'unordered'
  children: StrapiListItemNode[]
}

interface StrapiListItemNode extends StrapiBlockNode {
  type: 'list-item'
  children: StrapiInlineNode[]
}

interface StrapiQuoteNode extends StrapiBlockNode {
  type: 'quote'
  children: StrapiInlineNode[]
}

interface StrapiCodeNode extends StrapiBlockNode {
  type: 'code'
  language?: string
  children: Array<{ type: 'text'; text: string }>
}

interface StrapiImageNode extends StrapiBlockNode {
  type: 'image'
  image: {
    name?: string
    alternativeText?: string
    url: string
    caption?: string
    width?: number
    height?: number
    formats?: unknown
    hash?: string
    ext?: string
    mime?: string
    size?: number
    previewUrl?: string
    provider?: string
    provider_metadata?: unknown
    createdAt?: string
    updatedAt?: string
  }
}

interface StrapiLinkNode extends StrapiBlockNode {
  type: 'link'
  url: string
  children: StrapiInlineNode[]
}

type StrapiInlineNode = StrapiTextNode | StrapiLinkNode

/**
 * Strapi Blocks Converter
 * Converts between Strapi Blocks and universal rich text format
 */
export class BlocksConverter {
  /**
   * Convert Strapi Blocks to universal RichTextContent
   */
  fromBlocks(blocks: StrapiBlockNode[]): RichTextContent {
    return blocks
      .map(block => this.convertBlockFromStrapi(block))
      .filter((block): block is UniversalBlock => block !== null)
  }

  /**
   * Convert universal RichTextContent to Strapi Blocks
   */
  toBlocks(content: RichTextContent): StrapiBlockNode[] {
    return content.map(block => this.convertBlockToStrapi(block))
  }

  /**
   * Convert a single Strapi block to universal format
   */
  private convertBlockFromStrapi(block: StrapiBlockNode): UniversalBlock | null {
    switch (block.type) {
      case 'paragraph':
        return this.convertParagraphFromStrapi(block as StrapiParagraphNode)

      case 'heading':
        return this.convertHeadingFromStrapi(block as StrapiHeadingNode)

      case 'list':
        return this.convertListFromStrapi(block as StrapiListNode)

      case 'quote':
        return this.convertQuoteFromStrapi(block as StrapiQuoteNode)

      case 'code':
        return this.convertCodeFromStrapi(block as StrapiCodeNode)

      case 'image':
        return this.convertImageFromStrapi(block as StrapiImageNode)

      default:
        // Unknown block type - try to handle as custom block
        return this.convertCustomBlockFromStrapi(block)
    }
  }

  /**
   * Convert paragraph from Strapi
   */
  private convertParagraphFromStrapi(node: StrapiParagraphNode): TextBlock {
    const children = this.convertInlineNodes(node.children)

    return {
      _key: this.generateKey(),
      _type: 'block',
      style: 'normal',
      children,
    }
  }

  /**
   * Convert heading from Strapi
   */
  private convertHeadingFromStrapi(node: StrapiHeadingNode): TextBlock {
    const children = this.convertInlineNodes(node.children)
    const style = `h${node.level}` as BlockStyle

    return {
      _key: this.generateKey(),
      _type: 'block',
      style,
      children,
    }
  }

  /**
   * Convert list from Strapi
   */
  private convertListFromStrapi(node: StrapiListNode): ListBlock {
    const listType: ListType = node.format === 'ordered' ? 'number' : 'bullet'

    const items: ListItemBlock[] = node.children.map(item => ({
      _key: this.generateKey(),
      _type: 'listItem' as const,
      content: [{
        _key: this.generateKey(),
        _type: 'block' as const,
        style: 'normal' as const,
        children: this.convertInlineNodes(item.children),
      }],
    }))

    return {
      _key: this.generateKey(),
      _type: 'list',
      listType,
      items,
    }
  }

  /**
   * Convert quote from Strapi
   */
  private convertQuoteFromStrapi(node: StrapiQuoteNode): QuoteBlock {
    const content: TextBlock[] = [{
      _key: this.generateKey(),
      _type: 'block',
      style: 'normal',
      children: this.convertInlineNodes(node.children),
    }]

    return {
      _key: this.generateKey(),
      _type: 'quote',
      content,
    }
  }

  /**
   * Convert code block from Strapi
   */
  private convertCodeFromStrapi(node: StrapiCodeNode): CodeBlock {
    const code = node.children.map(child => child.text).join('\n')

    return {
      _key: this.generateKey(),
      _type: 'code',
      language: node.language,
      code,
    }
  }

  /**
   * Convert image from Strapi
   */
  private convertImageFromStrapi(node: StrapiImageNode): ImageBlock {
    return {
      _key: this.generateKey(),
      _type: 'image',
      asset: {
        url: node.image.url,
        metadata: {
          dimensions: node.image.width && node.image.height
            ? {
                width: node.image.width,
                height: node.image.height,
              }
            : undefined,
        },
      },
      alt: node.image.alternativeText,
      caption: node.image.caption,
    }
  }

  /**
   * Convert custom block from Strapi
   */
  private convertCustomBlockFromStrapi(block: StrapiBlockNode): UniversalBlock | null {
    // Pass through unknown blocks as CustomBlock
    const { type, ...rest } = block
    return {
      _key: this.generateKey(),
      _type: type,
      ...rest,
    } as UniversalBlock
  }

  /**
   * Convert inline nodes (text and links) from Strapi
   */
  private convertInlineNodes(nodes: StrapiInlineNode[]): UniversalSpan[] {
    const spans: UniversalSpan[] = []
    const markDefs: Array<{ _key: string; _type: string; href: string }> = []

    for (const node of nodes) {
      if (node.type === 'text') {
        const textNode = node as StrapiTextNode
        const marks: string[] = []

        // Convert formatting to marks
        if (textNode.bold) marks.push('strong')
        if (textNode.italic) marks.push('em')
        if (textNode.code) marks.push('code')
        if (textNode.underline) marks.push('underline')
        if (textNode.strikethrough) marks.push('strike')

        spans.push({
          _type: 'span',
          text: textNode.text,
          marks,
        })
      } else if (node.type === 'link') {
        const linkNode = node as StrapiLinkNode
        const markKey = this.generateKey()

        // Create link mark definition
        markDefs.push({
          _key: markKey,
          _type: 'link',
          href: linkNode.url,
        })

        // Convert link children to spans with link mark
        const linkChildren = this.convertInlineNodes(linkNode.children)
        for (const span of linkChildren) {
          spans.push({
            ...span,
            marks: [...span.marks, markKey],
            markDefs: markDefs.length > 0 ? markDefs : undefined,
          })
        }
      }
    }

    // Add markDefs to first span if we have any
    if (markDefs.length > 0 && spans.length > 0) {
      spans[0] = {
        ...spans[0],
        markDefs,
      }
    }

    return spans
  }

  /**
   * Convert a universal block to Strapi Blocks format
   */
  private convertBlockToStrapi(block: UniversalBlock): StrapiBlockNode {
    switch (block._type) {
      case 'block':
        return this.convertTextBlockToStrapi(block as TextBlock)

      case 'image':
        return this.convertImageToStrapi(block as ImageBlock)

      case 'code':
        return this.convertCodeToStrapi(block as CodeBlock)

      case 'quote':
        return this.convertQuoteToStrapi(block as QuoteBlock)

      case 'list':
        return this.convertListToStrapi(block as ListBlock)

      default:
        // Custom block - pass through
        return this.convertCustomBlockToStrapi(block)
    }
  }

  /**
   * Convert text block to Strapi format
   */
  private convertTextBlockToStrapi(block: TextBlock): StrapiBlockNode {
    const children = this.convertSpansToStrapi(block.children)

    // Determine block type based on style
    if (block.style === 'normal') {
      return {
        type: 'paragraph',
        children,
      }
    }

    if (block.style.startsWith('h')) {
      const level = parseInt(block.style.substring(1), 10) as 1 | 2 | 3 | 4 | 5 | 6
      return {
        type: 'heading',
        level,
        children,
      }
    }

    // Default to paragraph
    return {
      type: 'paragraph',
      children,
    }
  }

  /**
   * Convert image block to Strapi format
   */
  private convertImageToStrapi(block: ImageBlock): StrapiImageNode {
    return {
      type: 'image',
      image: {
        url: block.asset.url || '',
        alternativeText: block.alt,
        caption: typeof block.caption === 'string' ? block.caption : undefined,
        width: block.asset.metadata?.dimensions?.width,
        height: block.asset.metadata?.dimensions?.height,
      },
    }
  }

  /**
   * Convert code block to Strapi format
   */
  private convertCodeToStrapi(block: CodeBlock): StrapiCodeNode {
    return {
      type: 'code',
      language: block.language,
      children: [
        {
          type: 'text',
          text: block.code,
        },
      ],
    }
  }

  /**
   * Convert quote block to Strapi format
   */
  private convertQuoteToStrapi(block: QuoteBlock): StrapiQuoteNode {
    // Flatten quote content into inline nodes
    const children = block.content.flatMap(textBlock =>
      this.convertSpansToStrapi(textBlock.children)
    )

    return {
      type: 'quote',
      children,
    }
  }

  /**
   * Convert list block to Strapi format
   */
  private convertListToStrapi(block: ListBlock): StrapiListNode {
    const format = block.listType === 'number' ? 'ordered' : 'unordered'

    const children: StrapiListItemNode[] = block.items.map(item => ({
      type: 'list-item',
      children: item.content.flatMap(textBlock =>
        this.convertSpansToStrapi(textBlock.children)
      ),
    }))

    return {
      type: 'list',
      format,
      children,
    }
  }

  /**
   * Convert custom block to Strapi format
   */
  private convertCustomBlockToStrapi(block: BaseBlock): StrapiBlockNode {
    // Pass through custom blocks
    const { _key, _type, ...rest } = block
    return {
      type: _type,
      ...rest,
    }
  }

  /**
   * Convert universal spans to Strapi inline nodes
   */
  private convertSpansToStrapi(spans: UniversalSpan[]): StrapiInlineNode[] {
    const nodes: StrapiInlineNode[] = []

    // Collect all mark definitions
    const markDefs = new Map<string, { _type: string; href?: string }>()
    for (const span of spans) {
      if (span.markDefs) {
        for (const markDef of span.markDefs) {
          markDefs.set(markDef._key, markDef as { _type: string; href?: string })
        }
      }
    }

    for (const span of spans) {
      // Check if this span has a link mark
      const linkMarkKey = span.marks.find(mark => {
        const markDef = markDefs.get(mark)
        return markDef?._type === 'link'
      })

      if (linkMarkKey) {
        const linkDef = markDefs.get(linkMarkKey)
        if (linkDef?.href) {
          // Create link node with text child
          const textNode: StrapiTextNode = {
            type: 'text',
            text: span.text,
            bold: span.marks.includes('strong'),
            italic: span.marks.includes('em'),
            code: span.marks.includes('code'),
            underline: span.marks.includes('underline'),
            strikethrough: span.marks.includes('strike'),
          }

          nodes.push({
            type: 'link',
            url: linkDef.href,
            children: [textNode],
          })
          continue
        }
      }

      // Regular text node
      const textNode: StrapiTextNode = {
        type: 'text',
        text: span.text,
        bold: span.marks.includes('strong'),
        italic: span.marks.includes('em'),
        code: span.marks.includes('code'),
        underline: span.marks.includes('underline'),
        strikethrough: span.marks.includes('strike'),
      }

      nodes.push(textNode)
    }

    return nodes
  }

  /**
   * Generate a unique key
   */
  private generateKey(): string {
    return Math.random().toString(36).substring(2, 11)
  }
}

/**
 * Create a Blocks converter instance
 */
export function createBlocksConverter(): BlocksConverter {
  return new BlocksConverter()
}

/**
 * Convenience function: Convert from Strapi Blocks
 */
export function fromBlocks(blocks: unknown[]): RichTextContent {
  const converter = new BlocksConverter()
  return converter.fromBlocks(blocks as StrapiBlockNode[])
}

/**
 * Convenience function: Convert to Strapi Blocks
 */
export function toBlocks(content: RichTextContent): unknown[] {
  const converter = new BlocksConverter()
  return converter.toBlocks(content)
}
