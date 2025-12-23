/**
 * Portable Text Converter
 *
 * Converts between Sanity Portable Text and Universal RichTextContent
 * Handles bidirectional conversion while preserving structure and metadata
 */

import type {
  RichTextContent,
  UniversalBlock,
  TextBlock,
  UniversalSpan,
  ImageBlock,
  CodeBlock,
  CustomBlock,
} from '@contentbridge/core'

/**
 * Sanity Portable Text types
 * These match Sanity's native Portable Text structure
 */
interface PortableTextBlock {
  _key: string
  _type: string
  [key: string]: unknown
}

interface PortableTextTextBlock extends PortableTextBlock {
  _type: 'block'
  style?: string
  children: PortableTextSpan[]
  markDefs?: PortableTextMarkDef[]
  listItem?: string
  level?: number
}

interface PortableTextSpan {
  _type: 'span'
  _key?: string
  text: string
  marks?: string[]
}

interface PortableTextMarkDef {
  _key: string
  _type: string
  [key: string]: unknown
}

interface PortableTextImageBlock extends PortableTextBlock {
  _type: 'image'
  asset: {
    _ref?: string
    _type: 'reference'
  }
  alt?: string
  caption?: string | PortableTextTextBlock[]
  hotspot?: {
    x: number
    y: number
    width: number
    height: number
  }
  crop?: {
    top: number
    bottom: number
    left: number
    right: number
  }
}

/**
 * Portable Text Converter
 * Converts between Sanity Portable Text and universal rich text format
 */
export class PortableTextConverter {
  /**
   * Convert Sanity Portable Text to universal RichTextContent
   */
  fromPortableText(blocks: PortableTextBlock[]): RichTextContent {
    return blocks.map(block => this.convertBlockFromPortableText(block))
  }

  /**
   * Convert universal RichTextContent to Sanity Portable Text
   */
  toPortableText(content: RichTextContent): PortableTextBlock[] {
    return content.map(block => this.convertBlockToPortableText(block))
  }

  /**
   * Convert a single Portable Text block to universal format
   */
  private convertBlockFromPortableText(block: PortableTextBlock): UniversalBlock {
    switch (block._type) {
      case 'block':
        return this.convertTextBlockFromPortableText(block as PortableTextTextBlock)

      case 'image':
        return this.convertImageBlockFromPortableText(block as PortableTextImageBlock)

      case 'code':
        return this.convertCodeBlockFromPortableText(block)

      default:
        // Custom block - pass through with minimal transformation
        return this.convertCustomBlockFromPortableText(block) as UniversalBlock
    }
  }

  /**
   * Convert text block from Portable Text
   */
  private convertTextBlockFromPortableText(block: PortableTextTextBlock): TextBlock {
    const { _key, style = 'normal', children, markDefs = [], listItem, level } = block

    // Map Sanity styles to universal styles
    const universalStyle = this.mapStyleFromPortableText(style)

    // Convert spans
    const universalSpans: UniversalSpan[] = children.map(span => ({
      _type: 'span' as const,
      text: span.text,
      marks: span.marks || [],
      markDefs: markDefs.length > 0 ? markDefs.map(this.convertMarkDef) : undefined,
    }))

    const result: TextBlock = {
      _key,
      _type: 'block',
      style: universalStyle,
      children: universalSpans,
    }

    // Add list properties if present
    if (listItem) {
      result.listItem = this.mapListTypeFromPortableText(listItem)
    }

    if (level !== undefined) {
      result.level = level
    }

    return result
  }

  /**
   * Convert image block from Portable Text
   */
  private convertImageBlockFromPortableText(block: PortableTextImageBlock): ImageBlock {
    const { _key, asset, alt, caption, hotspot, crop } = block

    const result: ImageBlock = {
      _key,
      _type: 'image',
      asset: {
        _ref: asset._ref,
      },
    }

    if (alt) {
      result.alt = alt
    }

    if (caption) {
      // Convert caption - can be string or array of blocks
      if (typeof caption === 'string') {
        result.caption = caption
      } else {
        // Convert array of PortableTextTextBlock to TextBlock[]
        result.caption = caption.map(block => this.convertTextBlockFromPortableText(block))
      }
    }

    if (hotspot) {
      result.hotspot = hotspot
    }

    if (crop) {
      result.crop = crop
    }

    return result
  }

  /**
   * Convert code block from Portable Text
   */
  private convertCodeBlockFromPortableText(block: PortableTextBlock): CodeBlock {
    // Type assertion since we know this is a code block
    const codeBlock = block as unknown as {
      _key: string
      language?: string
      code: string
      filename?: string
      highlightedLines?: number[]
    }

    return {
      _key: codeBlock._key,
      _type: 'code',
      language: codeBlock.language,
      code: codeBlock.code,
      filename: codeBlock.filename,
      highlightedLines: codeBlock.highlightedLines,
    }
  }

  /**
   * Convert custom block from Portable Text
   */
  private convertCustomBlockFromPortableText(block: PortableTextBlock): CustomBlock {
    // Pass through custom blocks with minimal transformation
    // Spread the block to ensure all properties are included
    return {
      ...block,
      _key: block._key,
      _type: block._type,
    } as CustomBlock
  }

  /**
   * Convert a single universal block to Portable Text
   */
  private convertBlockToPortableText(block: UniversalBlock): PortableTextBlock {
    switch (block._type) {
      case 'block':
        return this.convertTextBlockToPortableText(block as TextBlock)

      case 'image':
        return this.convertImageBlockToPortableText(block as ImageBlock)

      case 'code':
        return this.convertCodeBlockToPortableText(block as CodeBlock)

      default:
        // Custom block - pass through
        return this.convertCustomBlockToPortableText(block as CustomBlock)
    }
  }

  /**
   * Convert text block to Portable Text
   */
  private convertTextBlockToPortableText(block: TextBlock): PortableTextTextBlock {
    const { _key, style, children, listItem, level } = block

    // Map universal styles to Sanity styles
    const portableStyle = this.mapStyleToPortableText(style)

    // Extract mark definitions from spans
    const markDefs: PortableTextMarkDef[] = []
    const seenMarkDefs = new Set<string>()

    for (const span of children) {
      if (span.markDefs) {
        for (const markDef of span.markDefs) {
          if (!seenMarkDefs.has(markDef._key)) {
            seenMarkDefs.add(markDef._key)
            markDefs.push(markDef as PortableTextMarkDef)
          }
        }
      }
    }

    // Convert spans (remove markDefs from individual spans)
    const portableSpans: PortableTextSpan[] = children.map(span => ({
      _type: 'span' as const,
      _key: this.generateKey(),
      text: span.text,
      marks: span.marks,
    }))

    const result: PortableTextTextBlock = {
      _key,
      _type: 'block',
      style: portableStyle,
      children: portableSpans,
      markDefs: markDefs.length > 0 ? markDefs : undefined,
    }

    // Add list properties if present
    if (listItem) {
      result.listItem = this.mapListTypeToPortableText(listItem)
    }

    if (level !== undefined) {
      result.level = level
    }

    return result
  }

  /**
   * Convert image block to Portable Text
   */
  private convertImageBlockToPortableText(block: ImageBlock): PortableTextImageBlock {
    const { _key, asset, alt, caption, hotspot, crop } = block

    const result: PortableTextImageBlock = {
      _key,
      _type: 'image',
      asset: {
        _ref: asset._ref || '',
        _type: 'reference',
      },
    }

    if (alt) {
      result.alt = alt
    }

    if (caption) {
      result.caption = caption
    }

    if (hotspot) {
      result.hotspot = hotspot
    }

    if (crop) {
      result.crop = crop
    }

    return result
  }

  /**
   * Convert code block to Portable Text
   */
  private convertCodeBlockToPortableText(block: CodeBlock): PortableTextBlock {
    const { _key, language, code, filename, highlightedLines } = block

    return {
      _key,
      _type: 'code',
      language,
      code,
      filename,
      highlightedLines,
    }
  }

  /**
   * Convert custom block to Portable Text
   */
  private convertCustomBlockToPortableText(block: CustomBlock): PortableTextBlock {
    // Pass through custom blocks
    return block as PortableTextBlock
  }

  /**
   * Convert mark definition
   */
  private convertMarkDef(markDef: PortableTextMarkDef): PortableTextMarkDef {
    // Pass through mark definitions (they're already compatible)
    return markDef
  }

  /**
   * Map Portable Text style to universal style
   */
  private mapStyleFromPortableText(style: string): TextBlock['style'] {
    const styleMap: Record<string, TextBlock['style']> = {
      normal: 'normal',
      h1: 'h1',
      h2: 'h2',
      h3: 'h3',
      h4: 'h4',
      h5: 'h5',
      h6: 'h6',
      blockquote: 'blockquote',
    }

    return styleMap[style] || 'normal'
  }

  /**
   * Map universal style to Portable Text style
   */
  private mapStyleToPortableText(style: TextBlock['style']): string {
    // Universal and Portable Text styles are mostly compatible
    return style
  }

  /**
   * Map Portable Text list type to universal list type
   */
  private mapListTypeFromPortableText(listItem: string): TextBlock['listItem'] {
    const listMap: Record<string, TextBlock['listItem']> = {
      bullet: 'bullet',
      number: 'number',
      check: 'check',
    }

    return listMap[listItem]
  }

  /**
   * Map universal list type to Portable Text list type
   */
  private mapListTypeToPortableText(listType: TextBlock['listItem']): string {
    // Universal and Portable Text list types are compatible
    return listType || 'bullet'
  }

  /**
   * Generate a unique key for Portable Text blocks
   */
  private generateKey(): string {
    return Math.random().toString(36).substring(2, 11)
  }
}

/**
 * Create a Portable Text converter instance
 */
export function createPortableTextConverter(): PortableTextConverter {
  return new PortableTextConverter()
}

/**
 * Convenience function: Convert from Portable Text
 */
export function fromPortableText(blocks: unknown[]): RichTextContent {
  const converter = new PortableTextConverter()
  return converter.fromPortableText(blocks as PortableTextBlock[])
}

/**
 * Convenience function: Convert to Portable Text
 */
export function toPortableText(content: RichTextContent): unknown[] {
  const converter = new PortableTextConverter()
  return converter.toPortableText(content)
}
