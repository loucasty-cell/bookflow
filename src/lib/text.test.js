import { describe, expect, it } from 'vitest'
import { documentId, normalizeText, splitParagraphs, splitSentences, stripMarkdown, wordCount } from './text.js'

describe('reader text helpers', () => {
  it('normalizes whitespace without flattening paragraphs', () => {
    expect(normalizeText(' First  line.\r\n\r\n Second\tline. ')).toBe('First line.\n\nSecond line.')
  })

  it('segments complete sentences for focus mode', () => {
    expect(splitSentences('One clear idea. Another follows!')).toEqual(['One clear idea.', 'Another follows!'])
  })

  it('creates readable paragraphs when text has no explicit breaks', () => {
    const result = splitParagraphs('One. Two. Three. Four. Five.')
    expect(result).toHaveLength(2)
    expect(result[0]).toContain('Four.')
  })

  it('cleans common markdown and counts words', () => {
    const clean = stripMarkdown('# A title\n\nRead **with care** and [wonder](https://example.com).')
    expect(clean).not.toContain('**')
    expect(wordCount(clean)).toBe(7)
  })

  it('builds a stable local progress key from file metadata', () => {
    expect(documentId({ name: 'book.pdf', size: 42, lastModified: 9 })).toBe('book.pdf:42:9')
  })
})
