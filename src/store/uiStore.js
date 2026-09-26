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
  focusBarOpen: true,
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
  setOcrOpen: (open) =>
    set((state) => ({
      ocrOpen: typeof open === "function" ? Boolean(open(state.ocrOpen)) : Boolean(open),
    })),
  setShowIntervention: (show) =>
    set((state) => ({
      showIntervention: typeof show === "function" ? Boolean(show(state.showIntervention)) : Boolean(show),
    })),
  setShowEntryIntro: (show) =>
    set((state) => ({
      showEntryIntro: typeof show === "function" ? Boolean(show(state.showEntryIntro)) : Boolean(show),
    })),
  setDragging: (dragging) =>
    set((state) => ({
      dragging: typeof dragging === "function" ? Boolean(dragging(state.dragging)) : Boolean(dragging),
    })),
  setFocusBarOpen: (open) =>
    set((state) => ({
      focusBarOpen: typeof open === "function" ? Boolean(open(state.focusBarOpen)) : Boolean(open),
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) =>
    set({
      error:
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : "",
    })
}));

export const useUIStore = createUIStore();
