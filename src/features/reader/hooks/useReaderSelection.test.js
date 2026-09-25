import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  slots: [],
  effectSlots: [],
  cursor: 0,
  pending: [],
  result: undefined,
  hookFn: null,
  props: undefined,
  busy: false,
  dirty: false,
  rendering: false,
}));

function depsEqual(previous, next) {
  if (previous === undefined || next === undefined) return false;
  if (previous.length !== next.length) return false;
  return previous.every((value, index) => Object.is(value, next[index]));
}

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useState: (initial) => {
      const index = harness.cursor++;
      if (!(index in harness.slots)) {
        harness.slots[index] = typeof initial === "function" ? initial() : initial;
      }
      const setState = (next) => {
        const value = typeof next === "function" ? next(harness.slots[index]) : next;
        if (Object.is(value, harness.slots[index])) return;
        harness.slots[index] = value;
        if (harness.rendering) {
          harness.dirty = true;
          return;
        }
        rerender();
      };
      return [harness.slots[index], setState];
    },
    useRef: (initial) => {
      const index = harness.cursor++;
      if (!(index in harness.slots)) harness.slots[index] = { current: initial };
      return harness.slots[index];
    },
    useMemo: (factory) => factory(),
    useCallback: (callback) => callback,
    useEffect: (effect, deps) => {
      const index = harness.cursor++;
      const slot = harness.effectSlots[index];
      const changed = !depsEqual(slot?.deps, deps);
      harness.effectSlots[index] = { deps, cleanup: null };
      if (!changed) return;
      if (slot?.cleanup) slot.cleanup();
      harness.pending.push(() => {
        const cleanup = effect();
        harness.effectSlots[index].cleanup = typeof cleanup === "function" ? cleanup : null;
      });
    },
  };
});

import { useReaderSelection } from "./useReaderSelection.js";

function renderOnce() {
  harness.cursor = 0;
  harness.pending = [];
  harness.dirty = false;
  harness.rendering = true;
  try {
    harness.result = harness.hookFn(harness.props);
  } finally {
    harness.rendering = false;
  }
  const effects = harness.pending;
  harness.pending = [];
  for (const effect of effects) effect();
}

function rerender() {
  if (harness.busy) {
    harness.dirty = true;
    return;
  }
  harness.busy = true;
  try {
    let guard = 0;
    do {
      harness.dirty = false;
      renderOnce();
    } while (harness.dirty && ++guard < 25);
  } finally {
    harness.busy = false;
  }
}

function renderHook(hookFn, props = {}) {
  harness.slots = [];
  harness.effectSlots = [];
  harness.hookFn = hookFn;
  harness.props = props;
  rerender();
  return {
    get result() {
      return harness.result;
    },
    rerender(nextProps) {
      if (nextProps) harness.props = nextProps;
      rerender();
    },
    unmount() {
      const effects = harness.effectSlots.filter(Boolean).reverse();
      harness.effectSlots = [];
      for (const slot of effects) slot.cleanup?.();
    },
  };
}

function createNode() {
  const listeners = new Map();
  return {
    contains: vi.fn(() => true),
    addEventListener: vi.fn((type, handler) => {
      listeners.set(type, [...(listeners.get(type) ?? []), handler]);
    }),
    removeEventListener: vi.fn((type, handler) => {
      const current = listeners.get(type) ?? [];
      const next = current.filter((item) => item !== handler);
      if (next.length) listeners.set(type, next);
      else listeners.delete(type);
    }),
    emit(type, event) {
      for (const handler of listeners.get(type) ?? []) handler(event);
    },
    count(type) {
      return (listeners.get(type) ?? []).length;
    },
  };
}

function installEnvironment() {
  const documentListeners = new Map();
  const fakeDocument = {
    addEventListener: vi.fn((type, handler) => {
      documentListeners.set(type, [...(documentListeners.get(type) ?? []), handler]);
    }),
    removeEventListener: vi.fn((type, handler) => {
      const current = documentListeners.get(type) ?? [];
      const next = current.filter((item) => item !== handler);
      if (next.length) documentListeners.set(type, next);
      else documentListeners.delete(type);
    }),
    emit(type, event) {
      for (const handler of documentListeners.get(type) ?? []) handler(event);
    },
    count(type) {
      return (documentListeners.get(type) ?? []).length;
    },
  };
  const liveSelection = { current: null };
  const fakeWindow = {
    getSelection: () => liveSelection.current,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
  };
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  globalThis.window = fakeWindow;
  globalThis.document = fakeDocument;
  return {
    fakeDocument,
    liveSelection,
    setSelection(next) {
      liveSelection.current = next;
    },
    restore() {
      globalThis.window = previousWindow;
      globalThis.document = previousDocument;
    },
  };
}

function makeSelection({ text, rect = { top: 120, left: 30, width: 180, height: 18 }, paragraphId = "p-7" } = {}) {
  const range = {
    commonAncestorContainer: { nodeType: 3 },
    getBoundingClientRect: () => rect,
  };
  return {
    isCollapsed: !text,
    rangeCount: text ? 1 : 0,
    toString: () => text ?? "",
    getRangeAt: () => range,
    anchorNode: {
      nodeType: 1,
      closest: (selector) =>
        selector === "[data-paragraph-id]"
          ? { getAttribute: () => paragraphId }
          : null,
    },
    removeAllRanges: vi.fn(),
  };
}

let env;

beforeEach(() => {
  vi.useFakeTimers();
  env = installEnvironment();
});

afterEach(() => {
  vi.useRealTimers();
  env.restore();
});

describe("useReaderSelection", () => {
  it("captures the selected passage, paragraph, book, and anchor rect", () => {
    const container = createNode();
    const view = renderHook(() =>
      useReaderSelection({
        containerRef: { current: container },
        activeParagraphId: "p-active",
        bookId: "book-1",
      }),
    );

    env.setSelection(makeSelection({ text: "Call me Ishmael." }));
    env.fakeDocument.emit("selectionchange", {});
    vi.advanceTimersByTime(80);

    expect(view.result.selection).toEqual({
      text: "Call me Ishmael.",
      paragraphId: "p-7",
      bookId: "book-1",
      quote: "Call me Ishmael.",
    });
    expect(view.result.hasSelection).toBe(true);
    expect(view.result.anchorRect).toEqual({ top: 120, left: 30, width: 180, height: 18 });
  });

  it("ignores selections made outside the reader container", () => {
    const container = createNode();
    container.contains.mockReturnValue(false);
    const view = renderHook(() =>
      useReaderSelection({
        containerRef: { current: container },
        activeParagraphId: "p-active",
        bookId: "book-1",
      }),
    );

    env.setSelection(makeSelection({ text: "Elsewhere" }));
    env.fakeDocument.emit("selectionchange", {});
    vi.advanceTimersByTime(80);

    expect(view.result.hasSelection).toBe(false);
    expect(view.result.anchorRect).toBeNull();
  });

  it("clears state when the selection collapses", () => {
    const container = createNode();
    const view = renderHook(() =>
      useReaderSelection({
        containerRef: { current: container },
        activeParagraphId: "p-active",
        bookId: "book-1",
      }),
    );

    env.setSelection(makeSelection({ text: "Keep me" }));
    env.fakeDocument.emit("selectionchange", {});
    vi.advanceTimersByTime(80);
    expect(view.result.hasSelection).toBe(true);

    env.setSelection(makeSelection({ text: "" }));
    env.fakeDocument.emit("selectionchange", {});
    vi.advanceTimersByTime(80);

    expect(view.result.hasSelection).toBe(false);
    expect(view.result.anchorRect).toBeNull();
  });

  it("preserves a programmatic selection while the toolbar closes", () => {
    const container = createNode();
    env.setSelection(makeSelection({ text: "Keep me" }));
    const view = renderHook(() =>
      useReaderSelection({
        containerRef: { current: container },
        activeParagraphId: "p-active",
        bookId: "book-1",
      }),
    );

    env.fakeDocument.emit("selectionchange", {});
    vi.advanceTimersByTime(80);
    view.result.selectText("Keep me", "p-7");
    env.setSelection(makeSelection({ text: "" }));
    env.fakeDocument.emit("selectionchange", {});
    vi.advanceTimersByTime(80);

    expect(view.result.selection.text).toBe("Keep me");
    vi.advanceTimersByTime(800);
    env.fakeDocument.emit("selectionchange", {});
    vi.advanceTimersByTime(80);
    expect(view.result.hasSelection).toBe(false);
  });

  it("clears the selection and the native range on Escape", () => {
    const container = createNode();
    const nativeSelection = makeSelection({ text: "Escape me" });
    env.setSelection(nativeSelection);
    const view = renderHook(() =>
      useReaderSelection({
        containerRef: { current: container },
        activeParagraphId: "p-active",
        bookId: "book-1",
      }),
    );

    env.fakeDocument.emit("selectionchange", {});
    vi.advanceTimersByTime(80);
    expect(view.result.hasSelection).toBe(true);

    env.fakeDocument.emit("keydown", { key: "Escape", target: { closest: () => null } });

    expect(view.result.hasSelection).toBe(false);
    expect(view.result.anchorRect).toBeNull();
    expect(nativeSelection.removeAllRanges).toHaveBeenCalled();
  });

  it("keeps Escape typing inside a text field", () => {
    const container = createNode();
    const nativeSelection = makeSelection({ text: "Keep this" });
    env.setSelection(nativeSelection);
    const view = renderHook(() =>
      useReaderSelection({
        containerRef: { current: container },
        activeParagraphId: "p-active",
        bookId: "book-1",
      }),
    );

    env.fakeDocument.emit("selectionchange", {});
    vi.advanceTimersByTime(80);

    const input = {
      closest: (selector) => (selector.includes("input") ? {} : null),
    };
    env.fakeDocument.emit("keydown", { key: "Escape", target: input });

    expect(view.result.hasSelection).toBe(true);
    expect(nativeSelection.removeAllRanges).not.toHaveBeenCalled();
  });

  it("remeasures the anchor rect on reader scroll without losing the passage", () => {
    const container = createNode();
    const view = renderHook(() =>
      useReaderSelection({
        containerRef: { current: container },
        activeParagraphId: "p-active",
        bookId: "book-1",
      }),
    );

    env.setSelection(makeSelection({ text: "Scroll me" }));
    env.fakeDocument.emit("selectionchange", {});
    vi.advanceTimersByTime(80);

    env.setSelection(
      makeSelection({ text: "Scroll me", rect: { top: 42, left: 30, width: 180, height: 18 } }),
    );
    container.emit("scroll", {});

    expect(view.result.selection.text).toBe("Scroll me");
    expect(view.result.anchorRect.top).toBe(42);
  });

  it("registers one document selection flow and tears it down with pending timers", () => {
    const container = createNode();
    const view = renderHook(() =>
      useReaderSelection({
        containerRef: { current: container },
        activeParagraphId: "p-active",
        bookId: "book-1",
      }),
    );

    expect(env.fakeDocument.count("selectionchange")).toBe(1);
    expect(env.fakeDocument.count("keydown")).toBe(1);
    expect(container.count("scroll")).toBe(1);

    env.setSelection(makeSelection({ text: "Pending" }));
    env.fakeDocument.emit("selectionchange", {});
    expect(vi.getTimerCount()).toBe(1);

    view.unmount();
    vi.advanceTimersByTime(200);

    expect(vi.getTimerCount()).toBe(0);
    expect(env.fakeDocument.count("selectionchange")).toBe(0);
    expect(env.fakeDocument.count("keydown")).toBe(0);
    expect(container.count("scroll")).toBe(0);
  });

  it("seeds a selection from a caller without touching the document", () => {
    const container = createNode();
    const view = renderHook(() =>
      useReaderSelection({
        containerRef: { current: container },
        activeParagraphId: "p-active",
        bookId: "book-1",
      }),
    );

    view.result.selectText("Seeded passage.", "p-3");

    expect(view.result.selection).toMatchObject({
      text: "Seeded passage.",
      paragraphId: "p-3",
      bookId: "book-1",
    });
    expect(container.addEventListener).not.toHaveBeenCalledWith(
      "selectionchange",
      expect.anything(),
    );
  });
});
