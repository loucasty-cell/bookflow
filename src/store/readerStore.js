import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getSafeStorage } from '../shared/lib/storage.js';
import { DEFAULT_SETTINGS } from '../features/reader/config.js';

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
      
      setProgress: (progress) => set({ progress }),
      
      setBookmarks: (bookmarks) => set({ bookmarks }),
      toggleBookmark: (id) => set((state) => {
        const exists = state.bookmarks.includes(id);
        return {
          bookmarks: exists 
            ? state.bookmarks.filter(b => b !== id)
            : [...state.bookmarks, id]
        };
      }),
      
      setNotes: (notes) => set({ notes }),
      addNote: (note) => set((state) => ({
        notes: [note, ...state.notes]
      })),
      deleteNote: (id) => set((state) => ({
        notes: state.notes.filter(n => n.id !== id)
      }))
    }),
    {
      name: 'bookflow-reader-storage',
      storage: storage ?? createJSONStorage(getSafeStorage),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...persistedState,
        settings: {
          ...DEFAULT_SETTINGS,
          ...(persistedState?.settings || {})
        }
      }),
      partialize: (state) => ({ 
        settings: state.settings 
      }),
    }
  )
);

export const useReaderStore = createReaderStore();

