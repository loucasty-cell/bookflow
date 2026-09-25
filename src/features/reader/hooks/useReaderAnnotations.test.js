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
})
