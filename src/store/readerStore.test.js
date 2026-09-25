import { beforeEach, describe, expect, it } from 'vitest'
import { createJSONStorage } from 'zustand/middleware'
import { memoryStorage } from '../shared/lib/storage.js'
import { createReaderStore } from './readerStore.js'

const READER_STORAGE_KEY = 'bookflow-reader-storage'

beforeEach(() => {
  memoryStorage.clear()
})

function seedReaderState(state) {
  memoryStorage.setItem(READER_STORAGE_KEY, JSON.stringify({ state, version: 0 }))
}

describe('readerStore annotations', () => {
  it('accepts array values and functional updaters', () => {
    const store = createReaderStore(memoryStorage)

    store.getState().setBookmarks(['paragraph-1'])
    store.getState().setBookmarks((current) => [...current, 'paragraph-2'])
    store.getState().setNotes([{ id: 'note-1', text: 'First' }])
    store.getState().setNotes((current) => [...current, { id: 'note-2', text: 'Second' }])

    expect(store.getState().bookmarks).toEqual(['paragraph-1', 'paragraph-2'])
    expect(store.getState().notes.map((note) => note.id)).toEqual(['note-1', 'note-2'])
  })

  it('normalizes invalid persisted annotation values to arrays', async () => {
    seedReaderState({
      settings: { theme: 'dusk' },
      bookmarks: { paragraph: 'paragraph-1' },
      notes: null,
    })

    const storage = createJSONStorage(() => memoryStorage)
    const store = createReaderStore(storage)
    await store.persist.rehydrate()

    expect(store.getState().bookmarks).toEqual([])
    expect(store.getState().notes).toEqual([])
    expect(store.getState().settings.theme).toBe('dusk')
  })

  it('adds and deletes notes by explicit id', () => {
    const store = createReaderStore(memoryStorage)
    const first = { id: 'note-1', text: 'First' }
    const second = { id: 'note-2', text: 'Second' }

    store.getState().setNotes([first])
    store.getState().addNote(second)
    expect(store.getState().notes).toEqual([second, first])

    store.getState().deleteNote(first.id)
    expect(store.getState().notes).toEqual([second])
  })

  it('toggles bookmarks by explicit id', () => {
    const store = createReaderStore(memoryStorage)

    store.getState().toggleBookmark('selected-paragraph')
    store.getState().toggleBookmark('active-paragraph')
    expect(store.getState().bookmarks).toEqual([
      'selected-paragraph',
      'active-paragraph',
    ])

    store.getState().toggleBookmark('selected-paragraph')
    expect(store.getState().bookmarks).toEqual(['active-paragraph'])
  })
})
