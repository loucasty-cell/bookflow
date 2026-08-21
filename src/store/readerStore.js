import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getSafeStorage } from '../shared/lib/storage.js';

const DEFAULT_SETTINGS = {
  fontSize: 16,
  columnWidth: 640,
  focusPace: 260,
  theme: "paper",
  mode: "focus",
};

export const createReaderStore = (storage = undefined) => create(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      progress: 0,
      bookmarks: [],
      notes: [],
      
      setSettings: (updater) => set((state) => ({ 
        settings: typeof updater === 'function' ? updater(state.settings) : { ...state.settings, ...updater } 
      })),
      
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
      partialize: (state) => ({ 
        settings: state.settings 
      }),
    }
  )
);

export const useReaderStore = createReaderStore();

