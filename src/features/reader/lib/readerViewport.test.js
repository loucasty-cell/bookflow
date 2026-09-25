import { describe, expect, it } from 'vitest'
import { ensureSelectedSegmentVisible, getSelectedSegmentAlignment } from './readerViewport.js'

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
    expect(result.targetScrollTop).toBe(772)
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
    expect(result.targetScrollTop).toBe(462)
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

  it('aligns relative to an offset scroll container', () => {
    const result = getSelectedSegmentAlignment({
      containerScrollTop: 400,
      maximumScrollTop: 1800,
      selectedTop: 650,
      selectedBottom: 750,
      visibleTop: 324,
      visibleBottom: 1076,
      containerTop: 300,
    })

    expect(result.targetScrollTop).toBeCloseTo(490.24)
  })

  it('aligns an element against an offset scroll container', () => {
    const container = {
      scrollTop: 400,
      clientHeight: 800,
      scrollHeight: 2000,
      getBoundingClientRect: () => ({
        top: 300,
        bottom: 1100,
        left: 0,
        right: 800,
      }),
    };
    const selected = {
      getBoundingClientRect: () => ({
        top: 650,
        bottom: 750,
        left: 100,
        right: 500,
      }),
    };

    const result = ensureSelectedSegmentVisible(selected, container, null);

    expect(result.targetScrollTop).toBeCloseTo(490.24);
  })

  it('preserves a visible large paragraph during passive alignment', () => {
    const result = getSelectedSegmentAlignment({
      containerScrollTop: 320,
      maximumScrollTop: 1800,
      selectedTop: 180,
      selectedBottom: 980,
      visibleTop: 100,
      visibleBottom: 700,
      preserveLargePosition: true,
    })

    expect(result.isLarge).toBe(true)
    expect(result.shouldScroll).toBe(false)
    expect(result.targetScrollTop).toBe(320)
  })
})
