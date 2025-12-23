/**
 * Slate Converter
 *
 * Converts between Payload's Slate rich text format and Universal RichTextContent
 * Handles bidirectional conversion while preserving structure and metadata
 */

import type {
  RichTextContent,
  UniversalBlock,
  TextBlock,
  UniversalSpan,
  ImageBlock,
  CodeBlock,
  BaseBlock,
  LinkMark,
} from '@contentbridge/core'

/**
 * Payload Slate types
 * These match Payload's default Slate structure
 */
interface SlateNode {
  type?: string
  children?: SlateNode[]
  text?: string
  [key: string]: unknown
}

interface SlateElement extends SlateNode {
  type: string
  children: SlateNode[]
}

interface SlateText extends SlateNode {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
}

interface SlateLink extends SlateElement {
  type: 'link'
  url: string
  newTab?: boolean
  children: SlateNode[]
}

interface SlateUpload extends SlateElement {
  type: 'upload'
  value: {
    id: string
  }
  relationTo: string
}

/**
 * Slate Converter
 * Converts between Payload Slate and universal rich text format
 */
export class SlateConverter {
  /**
   * Convert Payload Slate to universal RichTextContent
   */
  fromSlate(nodes: SlateNode[]): RichTextContent {
    return nodes
      .map(node => this.convertNodeFromSlate(node))
      .filter((block): block is UniversalBlock => block !== null)
  }

  /**
   * Convert universal RichTextContent to Payload Slate
   */
  toSlate(content: RichTextContent): SlateNode[] {
    return content.map(block => this.convertBlockToSlate(block))
  }

  /**
   * Convert a single Slate node to universal format
   */
  private convertNodeFromSlate(node: SlateNode): UniversalBlock | null {
    // Text nodes are handled within their parent elements
    if ('text' in node) {
      return null
    }

    const element = node as SlateElement

    switch (element.type) {
      // Paragraph and headings
      case 'p':
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
      case 'blockquote':
        return this.convertTextBlockFromSlate(element)

      // List items
      case 'li':
      case 'ol':
      case 'ul':
        return this.convertListBlockFromSlate(element)

      // Upload (images, files)
      case 'upload':
        return this.convertUploadFromSlate(element as SlateUpload)

      // Code block
      case 'code':
        return this.convertCodeBlockFromSlate(element)

      // Custom blocks - pass through
      default:
        return this.convertCustomBlockFromSlate(element) as UniversalBlock
    }
  }

  /**
   * Convert text block from Slate
   */
  private convertTextBlockFromSlate(element: SlateElement): TextBlock {
    const style = this.mapStyleFromSlate(element.type)
    const children = this.convertChildrenToSpans(element.children || [])

    // Check if this is a list item
    const listItem = this.detectListType(element)

    const result: TextBlock = {
      _key: this.generateKey(),
      _type: 'block',
      style,
      children,
    }

    if (listItem) {
      result.listItem = listItem
    }

    return result
  }

  /**
   * Convert Slate children to universal spans
   */
  private convertChildrenToSpans(children: SlateNode[]): UniversalSpan[] {
    const spans: UniversalSpan[] = []
    const markDefs: LinkMark[] = []

    for (const child of children) {
      if ('text' in child) {
        // Text node
        const textNode = child as SlateText
        const marks: string[] = []

        // Extract marks
        if (textNode.bold) marks.push('strong')
        if (textNode.italic) marks.push('em')
        if (textNode.underline) marks.push('underline')
        if (textNode.strikethrough) marks.push('strike')
        if (textNode.code) marks.push('code')

        spans.push({
          _type: 'span',
          text: textNode.text,
          marks,
        })
      } else if (child.type === 'link') {
        // Link node - extract link mark and process children
        const linkNode = child as SlateLink
        const linkKey = this.generateKey()

        markDefs.push({
          _key: linkKey,
          _type: 'link',
          href: linkNode.url,
          target: linkNode.newTab ? '_blank' : undefined,
        })

        // Process link children
        const linkSpans = this.convertChildrenToSpans(linkNode.children || [])
        for (const span of linkSpans) {
          spans.push({
            ...span,
            marks: [...span.marks, linkKey],
            markDefs: markDefs.length > 0 ? markDefs : undefined,
          })
        }
      }
    }

    // Add markDefs to first span if present
    if (markDefs.length > 0 && spans.length > 0) {
      spans[0].markDefs = markDefs
    }

    return spans
  }

  /**
   * Convert list block from Slate
   */
  private convertListBlockFromSlate(element: SlateElement): TextBlock {
    const listType = element.type === 'ol' ? 'number' : 'bullet'

    // In Slate, lists contain li elements
    // We'll flatten to individual blocks with listItem property
    if (element.children && element.children.length > 0) {
      const firstChild = element.children[0]
      if ('type' in firstChild && firstChild.type === 'li') {
        const liElement = firstChild as SlateElement
        const children = this.convertChildrenToSpans(liElement.children || [])

        return {
          _key: this.generateKey(),
          _type: 'block',
          style: 'normal',
          listItem: listType,
          level: 0,
          children,
        }
      }
    }

    // Fallback to normal block
    return {
      _key: this.generateKey(),
      _type: 'block',
      style: 'normal',
      listItem: listType,
      children: [],
    }
  }

  /**
   * Convert upload (image/file) from Slate
   */
  private convertUploadFromSlate(element: SlateUpload): ImageBlock {
    return {
      _key: this.generateKey(),
      _type: 'image',
      asset: {
        _ref: element.value.id,
      },
    }
  }

  /**
   * Convert code block from Slate
   */
  private convertCodeBlockFromSlate(element: SlateElement): CodeBlock {
    // Extract code text from children
    const codeText = element.children
      ?.map(child => ('text' in child ? (child as SlateText).text : ''))
      .join('') || ''

    return {
      _key: this.generateKey(),
      _type: 'code',
      code: codeText,
      language: (element.language as string) || undefined,
    }
  }

  /**
   * Convert custom block from Slate
   */
  private convertCustomBlockFromSlate(element: SlateElement): BaseBlock {
    return {
      _key: this.generateKey(),
      _type: element.type,
      ...element,
    }
  }

  /**
   * Convert a single universal block to Slate
   */
  private convertBlockToSlate(block: UniversalBlock): SlateNode {
    if (block._type === 'block') {
      return this.convertTextBlockToSlate(block as TextBlock)
    } else if (block._type === 'image') {
      return this.convertImageBlockToSlate(block as ImageBlock)
    } else if (block._type === 'code') {
      return this.convertCodeBlockToSlate(block as CodeBlock)
    } else {
      return this.convertCustomBlockToSlate(block as BaseBlock)
    }
  }

  /**
   * Convert text block to Slate
   */
  private convertTextBlockToSlate(block: TextBlock): SlateElement {
    const type = this.mapStyleToSlate(block.style)
    const children = this.convertSpansToSlateNodes(block.children)

    const result: SlateElement = {
      type,
      children,
    }

    // Handle list items
    if (block.listItem) {
      const listType = block.listItem === 'number' ? 'ol' : 'ul'
      return {
        type: listType,
        children: [
          {
            type: 'li',
            children,
          },
        ],
      }
    }

    return result
  }

  /**
   * Convert universal spans to Slate nodes
   */
  private convertSpansToSlateNodes(spans: UniversalSpan[]): SlateNode[] {
    const nodes: SlateNode[] = []

    for (const span of spans) {
      // Extract marks
      const textNode: SlateText = {
        text: span.text,
      }

      // Apply formatting marks
      if (span.marks.includes('strong')) textNode.bold = true
      if (span.marks.includes('em')) textNode.italic = true
      if (span.marks.includes('underline')) textNode.underline = true
      if (span.marks.includes('strike')) textNode.strikethrough = true
      if (span.marks.includes('code')) textNode.code = true

      // Check for link marks
      const linkMark = span.marks.find(mark => mark.startsWith('link-'))
      if (linkMark && span.markDefs) {
        const linkDef = span.markDefs.find(def => def._key === linkMark) as LinkMark | undefined
        if (linkDef) {
          nodes.push({
            type: 'link',
            url: linkDef.href,
            newTab: linkDef.target === '_blank',
            children: [textNode],
          })
          continue
        }
      }

      nodes.push(textNode)
    }

    return nodes
  }

  /**
   * Convert image block to Slate
   */
  private convertImageBlockToSlate(block: ImageBlock): SlateElement {
    return {
      type: 'upload',
      value: {
        id: block.asset._ref || '',
      },
      relationTo: 'media',
      children: [{ text: '' }], // Slate requires children
    }
  }

  /**
   * Convert code block to Slate
   */
  private convertCodeBlockToSlate(block: CodeBlock): SlateElement {
    return {
      type: 'code',
      language: block.language,
      children: [
        {
          text: block.code,
        },
      ],
    }
  }

  /**
   * Convert custom block to Slate
   */
  private convertCustomBlockToSlate(block: BaseBlock): SlateElement {
    return {
      type: block._type,
      children: [{ text: '' }],
      ...block,
    }
  }

  /**
   * Map Slate element type to universal style
   */
  private mapStyleFromSlate(type: string): TextBlock['style'] {
    const styleMap: Record<string, TextBlock['style']> = {
      p: 'normal',
      h1: 'h1',
      h2: 'h2',
      h3: 'h3',
      h4: 'h4',
      h5: 'h5',
      h6: 'h6',
      blockquote: 'blockquote',
    }

    return styleMap[type] || 'normal'
  }

  /**
   * Map universal style to Slate element type
   */
  private mapStyleToSlate(style: TextBlock['style']): string {
    const styleMap: Record<TextBlock['style'], string> = {
      normal: 'p',
      h1: 'h1',
      h2: 'h2',
      h3: 'h3',
      h4: 'h4',
      h5: 'h5',
      h6: 'h6',
      blockquote: 'blockquote',
      pre: 'code',
    }

    return styleMap[style] || 'p'
  }

  /**
   * Detect if element is part of a list
   */
  private detectListType(_element: SlateElement): TextBlock['listItem'] | undefined {
    // This would need more context in a real implementation
    // For now, return undefined as lists are handled separately
    return undefined
  }

  /**
   * Generate a unique key for blocks
   */
  private generateKey(): string {
    return Math.random().toString(36).substring(2, 11)
  }
}

/**
 * Create a Slate converter instance
 */
export function createSlateConverter(): SlateConverter {
  return new SlateConverter()
}

/**
 * Convenience function: Convert from Slate
 */
export function fromSlate(nodes: unknown[]): RichTextContent {
  const converter = new SlateConverter()
  return converter.fromSlate(nodes as SlateNode[])
}

/**
 * Convenience function: Convert to Slate
 */
export function toSlate(content: RichTextContent): unknown[] {
  const converter = new SlateConverter()
  return converter.toSlate(content)
}
