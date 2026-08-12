import { describe, expect, it } from 'vitest'
import { getSelectedSegmentAlignment } from './readerViewport.js'

describe('reader safe viewport alignment', () => {
  it('moves a normal paragraph into the preferred reading zone', () => {
    const result = getSelectedSegmentAlignment({
      containerScrollTop: 400,
      maximumScrollTop: 1800,
      selectedTop: 650,
      selectedBottom: 750,
      visibleTop: 100,
      visibleBottom: 700,
    })

    expect(result.isLarge).toBe(false)
    expect(result.shouldScroll).toBe(true)
    expect(result.targetScrollTop).toBe(800)
  })

  it('does not move a visible paragraph already inside the focus zone', () => {
    const result = getSelectedSegmentAlignment({
      containerScrollTop: 500,
      maximumScrollTop: 1800,
      selectedTop: 220,
      selectedBottom: 360,
      visibleTop: 100,
      visibleBottom: 700,
    })

    expect(result.isLarge).toBe(false)
    expect(result.fullyVisible).toBe(true)
    expect(result.shouldScroll).toBe(false)
    expect(result.targetScrollTop).toBe(470)
  })

  it('aligns a paragraph taller than the usable viewport by its beginning', () => {
    const result = getSelectedSegmentAlignment({
      containerScrollTop: 900,
      maximumScrollTop: 2400,
      selectedTop: -180,
      selectedBottom: 720,
      visibleTop: 80,
      visibleBottom: 680,
    })

    expect(result.isLarge).toBe(true)
    expect(result.targetScrollTop).toBe(640)
  })

  it('clamps alignment at the document boundaries', () => {
    const result = getSelectedSegmentAlignment({
      containerScrollTop: 40,
      maximumScrollTop: 1200,
      selectedTop: 20,
      selectedBottom: 100,
      visibleTop: 80,
      visibleBottom: 680,
    })

    expect(result.targetScrollTop).toBe(0)
  })
})
