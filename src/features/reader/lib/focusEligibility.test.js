import { describe, expect, it } from 'vitest'
import { isFocusEligibleChapter } from './focusEligibility.js'

const chapter = (title, paragraphs = ['A real paragraph with enough words to represent context.']) => ({ title, paragraphs })

describe('focus eligibility', () => {
  it('keeps introductions visible but excludes them from paragraph selection', () => {
    expect(isFocusEligibleChapter(chapter('Introduction'), 0, 2)).toBe(false)
    expect(isFocusEligibleChapter(chapter('Preface'), 0, 2)).toBe(false)
  })

  it('starts selection at an explicit real context heading', () => {
    expect(isFocusEligibleChapter(chapter('Chapter One', ['Short but real context.']), 1, 2)).toBe(true)
    expect(isFocusEligibleChapter(chapter('Begin with wonder', ['Short but real context.']), 0, 3)).toBe(true)
  })

  it('excludes named end matter even when the book has only a few sections', () => {
    expect(isFocusEligibleChapter(chapter('References'), 1, 2)).toBe(false)
    expect(isFocusEligibleChapter(chapter('Index'), 1, 2)).toBe(false)
  })
})
