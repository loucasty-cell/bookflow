import { create } from 'zustand';

// Allow dependency injection for testing initial state
export const createUIStore = (initialState = {}) => create((set) => ({
  settingsOpen: false,
  sidebarOpen: false,
  sidebarCollapsed: false,
  notesOpen: false,
  ocrOpen: false,
  showIntervention: false,
  showEntryIntro: false,
  dragging: false,
  loading: null,
  error: "",
  ...initialState,
  
  setSettingsOpen: (open) =>
    set((state) => ({
      settingsOpen: typeof open === "function" ? Boolean(open(state.settingsOpen)) : Boolean(open),
    })),
  setSidebarOpen: (open) =>
    set((state) => ({
      sidebarOpen: typeof open === "function" ? Boolean(open(state.sidebarOpen)) : Boolean(open),
    })),
  setSidebarCollapsed: (collapsed) =>
    set((state) => ({
      sidebarCollapsed:
        typeof collapsed === "function" ? Boolean(collapsed(state.sidebarCollapsed)) : Boolean(collapsed),
    })),
  setNotesOpen: (open) =>
    set((state) => ({
      notesOpen: typeof open === "function" ? Boolean(open(state.notesOpen)) : Boolean(open),
    })),
  setOcrOpen: (open) => set({ ocrOpen: open }),
  setShowIntervention: (show) => set({ showIntervention: show }),
  setShowEntryIntro: (show) => set({ showEntryIntro: show }),
  setDragging: (dragging) => set({ dragging }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));

export const useUIStore = createUIStore();
