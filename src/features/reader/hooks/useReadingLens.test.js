import { describe, expect, it, vi } from "vitest";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useCallback: (fn) => fn,
    useRef: (val) => ({ current: val }),
    useState: (initial) => [initial, vi.fn()],
    useEffect: vi.fn(),
  };
});

import { useReadingLens } from "./useReadingLens.js";
import { useReaderSelection } from "./useReaderSelection.js";

describe("useReadingLens", () => {
  it("initializes with calm defaults", () => {
    const hook = useReadingLens({
      currentParagraphText: "Passage test content.",
      selectedText: "",
    });

    expect(hook.messages).toEqual([]);
    expect(hook.isLoading).toBe(false);
    expect(hook.isExpanded).toBe(false);
    expect(hook.activePassage).toBe("Passage test content.");
  });

  it("prioritizes selectedText over paragraph text", () => {
    const hook = useReadingLens({
      currentParagraphText: "Full paragraph.",
      selectedText: "Highlighted quote.",
    });

    expect(hook.activePassage).toBe("Highlighted quote.");
  });
});

describe("useReaderSelection", () => {
  it("initializes selection state structure", () => {
    const hook = useReaderSelection({
      containerRef: { current: null },
      activeParagraphId: "p-1",
      bookId: "book-1",
    });

    expect(hook.selection).toBeDefined();
    expect(typeof hook.setSelection).toBe("function");
    expect(typeof hook.clearSelection).toBe("function");
  });
});
