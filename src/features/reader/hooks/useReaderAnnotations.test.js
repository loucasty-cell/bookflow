import { describe, expect, it, vi } from 'vitest'

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useCallback: (callback) => callback,
    useState: (initialValue) => [initialValue, vi.fn()],
  }
})

import { useReaderAnnotations } from './useReaderAnnotations.js'

describe('useReaderAnnotations bookmarks', () => {
  it('toggles the explicit selection id instead of the active focus id', () => {
    const setBookmarks = vi.fn()
    const annotations = useReaderAnnotations({
      focusId: 'active-paragraph',
      focusedParagraph: { id: 'active-paragraph', text: 'Active paragraph' },
      setBookmarks,
      setNotes: vi.fn(),
      setError: vi.fn(),
    })

    annotations.toggleBookmark('selected-paragraph')

    const updateBookmarks = setBookmarks.mock.calls[0][0]
    expect(updateBookmarks(['active-paragraph'])).toEqual([
      'active-paragraph',
      'selected-paragraph',
    ])
    expect(updateBookmarks(['active-paragraph', 'selected-paragraph'])).toEqual([
      'active-paragraph',
    ])
  })

  it('adds note with bold option and custom text', () => {
    const setNotes = vi.fn()
    const annotations = useReaderAnnotations({
      focusId: 'para-1',
      focusedParagraph: { id: 'para-1', text: 'Important paragraph' },
      setBookmarks: vi.fn(),
      setNotes,
      setError: vi.fn(),
    })

    annotations.addNote({
      text: 'A bold insight',
      bold: true,
    })

    expect(setNotes).toHaveBeenCalledTimes(1)
    const updater = setNotes.mock.calls[0][0]
    const updated = updater([])
    expect(updated).toHaveLength(1)
    expect(updated[0].text).toBe('A bold insight')
    expect(updated[0].bold).toBe(true)
    expect(updated[0].paragraphId).toBe('para-1')
    expect(updated[0].quote).toBe('Important paragraph')
  })

  it('allows adding general session notes even when focusId is not set', () => {
    const setNotes = vi.fn()
    const annotations = useReaderAnnotations({
      focusId: '',
      focusedParagraph: null,
      setBookmarks: vi.fn(),
      setNotes,
      setError: vi.fn(),
    })

    annotations.addNote({
      text: 'General session thought',
      bold: false,
    })

    expect(setNotes).toHaveBeenCalledTimes(1)
    const updater = setNotes.mock.calls[0][0]
    const updated = updater([])
    expect(updated).toHaveLength(1)
    expect(updated[0].text).toBe('General session thought')
    expect(updated[0].bold).toBe(false)
    expect(updated[0].paragraphId).toBe('')
  })
})
