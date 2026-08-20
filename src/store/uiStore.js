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
  
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setNotesOpen: (open) => set({ notesOpen: open }),
  setOcrOpen: (open) => set({ ocrOpen: open }),
  setShowIntervention: (show) => set({ showIntervention: show }),
  setShowEntryIntro: (show) => set({ showEntryIntro: show }),
  setDragging: (dragging) => set({ dragging }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));

export const useUIStore = createUIStore();
