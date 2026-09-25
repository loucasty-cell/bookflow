import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getSafeStorage } from '../shared/lib/storage.js';
import { DEFAULT_SETTINGS } from '../features/reader/config.js';

const normalizeArray = (value) => Array.isArray(value) ? value : [];

const resolveArray = (updater, current) =>
  normalizeArray(typeof updater === 'function' ? updater(normalizeArray(current)) : updater);

export const createReaderStore = (storage = undefined) => create(
  persist(
    (set) => ({
      settings: { ...DEFAULT_SETTINGS },
      progress: 0,
      bookmarks: [],
      notes: [],
      
      setSettings: (updater) => set((state) => {
        const nextSettings = typeof updater === 'function' ? updater(state.settings) : { ...state.settings, ...updater };
        return {
          settings: { ...DEFAULT_SETTINGS, ...nextSettings }
        };
      }),
      
      setProgress: (progress) => set((state) => {
        const value = typeof progress === 'function' ? progress(state.progress) : progress;
        const safe = Number.isFinite(Number(value)) ? Math.min(100, Math.max(0, Math.round(Number(value)))) : 0;
        return { progress: safe };
      }),
      
      setBookmarks: (updater) => set((state) => ({
        bookmarks: resolveArray(updater, state.bookmarks)
      })),
      toggleBookmark: (id) => set((state) => {
        const bookmarks = normalizeArray(state.bookmarks);
        if (!id) return { bookmarks };
        const exists = bookmarks.includes(id);
        return {
          bookmarks: exists
            ? bookmarks.filter(bookmarkId => bookmarkId !== id)
            : [...bookmarks, id]
        };
      }),
      
      setNotes: (updater) => set((state) => ({
        notes: resolveArray(updater, state.notes)
      })),
      addNote: (note) => set((state) => ({
        notes: [note, ...normalizeArray(state.notes)]
      })),
      deleteNote: (id) => set((state) => ({
        notes: normalizeArray(state.notes).filter(note => note.id !== id)
      }))
    }),
    {
      name: 'bookflow-reader-storage',
      storage: storage ?? createJSONStorage(getSafeStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState && typeof persistedState === 'object' ? persistedState : {};
        return {
          ...currentState,
          ...persisted,
          settings: {
            ...DEFAULT_SETTINGS,
            ...(persisted.settings || {})
          },
          bookmarks: normalizeArray(persisted.bookmarks ?? currentState.bookmarks),
          notes: normalizeArray(persisted.notes ?? currentState.notes)
        };
      },
      partialize: (state) => ({ 
        settings: state.settings 
      }),
    }
  )
);

export const useReaderStore = createReaderStore();

