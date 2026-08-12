import { describe, expect, it } from 'vitest'
import { selectClosestParagraph, selectFocusTarget, selectNextParagraph } from './focusRail.js'

describe('paragraph focus selection', () => {
  it('selects the paragraph crossing the fixed rail', () => {
    const target = selectClosestParagraph([
      { id: 'before', top: 120, bottom: 150, left: 0 },
      { id: 'active', top: 180, bottom: 230, left: 0 },
      { id: 'after', top: 270, bottom: 320, left: 0 },
    ], 195)

    expect(target.id).toBe('active')
  })

  it('keeps the current paragraph when the rail crosses a shared boundary', () => {
    const target = selectFocusTarget([
      { id: 'previous', top: 120, bottom: 190, left: 0 },
      { id: 'current', top: 190, bottom: 260, left: 0 },
    ], 190, 'current')

    expect(target.id).toBe('current')
  })

  it('moves through whole paragraphs without jumping more than requested', () => {
    const target = selectNextParagraph([
      { id: 'one', top: 100, bottom: 150, left: 0 },
      { id: 'two', top: 180, bottom: 230, left: 0 },
      { id: 'three', top: 260, bottom: 310, left: 0 },
      { id: 'four', top: 340, bottom: 390, left: 0 },
    ], 'one', 1, 2)

    expect(target.id).toBe('three')
  })

  it('moves backward through whole paragraphs', () => {
    const target = selectNextParagraph([
      { id: 'one', top: 100, bottom: 150, left: 0 },
      { id: 'two', top: 180, bottom: 230, left: 0 },
      { id: 'three', top: 260, bottom: 310, left: 0 },
    ], 'three', -1)

    expect(target.id).toBe('two')
  })
})
