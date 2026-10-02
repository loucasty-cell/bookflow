/**
 * lensBarStore: lens bar preferences only.
 *
 * Position, mode and target language. Never a question, never an answer and
 * never book text, so nothing written here can leak a document.
 *
 * Consent is deliberately absent. It belongs to the Reading Lens hook, and
 * duplicating it here would give the reader two disagreeing answers about
 * whether a passage may leave the device.
 */
import { create } from 'zustand';
import { getSafeStorage, safeParse, setStorageItem } from '../../../shared/lib/index.js';
import { DEFAULT_RATIO } from '../lib/position.js';

const KEY = 'bookflow:lens-bar';
const MODES = ['smart', 'summarize', 'explain', 'translate', 'define', 'ask'];
const MAX_LANGUAGE = 40;

function safeRatio(raw) {
  const fx = Number(raw?.fx);
  const fy = Number(raw?.fy);
  if (!Number.isFinite(fx) || !Number.isFinite(fy)) return { ...DEFAULT_RATIO };
  return {
    fx: Math.min(1, Math.max(0, fx)),
    fy: Math.min(1, Math.max(0, fy)),
  };
}

/**
 * Validates a parsed stored payload. Pure, so a poisoned value can be tested
 * directly instead of depending on module import order.
 */
export function readLensBarPreferences(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return {
    ratio: safeRatio(raw.ratio),
    mode: MODES.includes(raw.mode) ? raw.mode : 'smart',
    language:
      typeof raw.language === 'string' && raw.language.trim()
        ? raw.language.slice(0, MAX_LANGUAGE)
        : 'English',
  };
}

function read() {
  try {
    return readLensBarPreferences(safeParse(getSafeStorage().getItem(KEY), null));
  } catch {
    return {};
  }
}

function write(state) {
  setStorageItem(KEY, {
    ratio: state.ratio,
    mode: state.mode,
    language: state.language,
  });
}

export const useLensBarStore = create((set, get) => ({
  open: false,
  collapsed: false,
  ratio: DEFAULT_RATIO,
  mode: 'smart',
  language: 'English',
  ...read(),
  setOpen: (open) => set({ open: Boolean(open) }),
  setCollapsed: (collapsed) => set({ collapsed: Boolean(collapsed) }),
  setRatio: (ratio) => {
    set({ ratio: safeRatio(ratio) });
    write(get());
  },
  setMode: (mode) => {
    if (!MODES.includes(mode)) return;
    set({ mode });
    write(get());
  },
  setLanguage: (language) => {
    set({ language: String(language ?? '').slice(0, MAX_LANGUAGE) });
    write(get());
  },
}));

export const LENS_BAR_MODES = MODES;
export const LENS_BAR_STORAGE_KEY = KEY;
