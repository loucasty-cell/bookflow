import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_SETTINGS = {
  fontSize: 16,
  columnWidth: 640,
  focusPace: 260,
  theme: "paper",
  mode: "focus",
};

// Extracted from shared/lib/index.js (replicated for store simplicity)
const safeParse = (json, fallback) => {
  try {
    return json ? JSON.parse(json) : fallback;
  } catch {
    return fallback;
  }
};

// Allow dependency injection for testing storage
export const createReaderStore = (storage = undefined) => create(
  persist(
    (set, get) => ({
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
      storage, // Dependency injection point
      partialize: (state) => ({ 
        settings: state.settings 
      }),
    }
  )
);

export const useReaderStore = createReaderStore();
