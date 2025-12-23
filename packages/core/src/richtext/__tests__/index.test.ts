/**
 * Rich text types tests
 *
 * Tests for rich text type definitions and structures
 */

import { describe, it, expect } from 'vitest'
import type { UniversalBlock, RichTextContent } from '../index'

describe('Rich Text Types', () => {
  describe('UniversalBlock', () => {
    it('should create a text block', () => {
      const block: UniversalBlock = {
        _type: 'block',
        _key: 'block-1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'span-1',
            text: 'Hello world',
            marks: [],
          },
        ],
      }

      expect(block._type).toBe('block')
      expect(block.style).toBe('normal')
      expect(block.children).toHaveLength(1)
    })

    it('should support heading styles', () => {
      const headings: UniversalBlock['style'][] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']

      headings.forEach((style) => {
        const block: UniversalBlock = {
          _type: 'block',
          _key: `block-${style}`,
          style,
          children: [],
        }
        expect(block.style).toBe(style)
      })
    })

    it('should support list items', () => {
      const block: UniversalBlock = {
        _type: 'block',
        _key: 'block-list',
        style: 'normal',
        listItem: 'bullet',
        children: [],
      }

      expect(block.listItem).toBe('bullet')
    })

    it('should support marks on spans', () => {
      const block: UniversalBlock = {
        _type: 'block',
        _key: 'block-1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'span-1',
            text: 'bold text',
            marks: ['strong', 'em'],
          },
        ],
      }

      expect(block.children[0].marks).toContain('strong')
      expect(block.children[0].marks).toContain('em')
    })
  })

  describe('RichTextContent', () => {
    it('should be an array of blocks', () => {
      const content: RichTextContent = [
        {
          _type: 'block',
          _key: 'block-1',
          style: 'h1',
          children: [
            {
              _type: 'span',
              _key: 'span-1',
              text: 'Title',
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
              text: 'Paragraph',
              marks: [],
            },
          ],
        },
      ]

      expect(Array.isArray(content)).toBe(true)
      expect(content).toHaveLength(2)
    })

    it('should support empty content', () => {
      const content: RichTextContent = []

      expect(Array.isArray(content)).toBe(true)
      expect(content).toHaveLength(0)
    })
  })
})
