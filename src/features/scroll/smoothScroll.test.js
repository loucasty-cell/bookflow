import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = { lenis: null };

vi.mock("lenis", () => ({
  default: class FakeLenis {
    constructor(options) {
      this.options = options;
      this.calls = [];
      state.lenis = this;
    }
    raf() {}
    destroy() {
      this.destroyed = true;
    }
    scrollTo(target, options) {
      this.calls.push({ target, options });
      return this;
    }
  },
}));

vi.mock("gsap", () => ({
  gsap: {
    ticker: { add: vi.fn(), clear: vi.fn(), lagSmoothing: vi.fn() },
    lagSmoothing: vi.fn(),
  },
}));

import {
  SMOOTH_SCROLL_REASON,
  getSmoothScroll,
  isNestedScroller,
  isSmoothScrollActive,
  scrollContainerTo,
  startReaderSmoothScroll,
  startSmoothScroll,
  stopAllSmoothScroll,
  stopReaderSmoothScroll,
} from "./smoothScroll.js";

const BODY = { classList: [] };

function fakeNode(classNames = [], parent = BODY) {
  return { classList: classNames, parentElement: parent };
}

function makeWrapper() {
  return { dataset: {}, isConnected: true };
}

beforeEach(() => {
  state.lenis = null;
});

afterEach(() => {
  stopAllSmoothScroll();
});

describe("smooth scroll lifecycle", () => {
  it("marks the container so programmatic scrolls can find the instance", async () => {
    const wrapper = makeWrapper();
    await startReaderSmoothScroll(wrapper, undefined);
    expect(wrapper.dataset.smoothScrollReason).toBe(SMOOTH_SCROLL_REASON.reader);
    expect(isSmoothScrollActive(SMOOTH_SCROLL_REASON.reader)).toBe(true);
  });

  it("reuses one instance per reason instead of stacking duplicates", async () => {
    const wrapper = makeWrapper();
    const first = await startSmoothScroll("landing", { wrapper });
    const second = await startSmoothScroll("landing", { wrapper });
    expect(first).toBe(second);
    expect(getSmoothScroll("landing")).toBe(first);
  });

  it("destroys the instance and clears the marker on stop", async () => {
    const wrapper = makeWrapper();
    const lenis = await startReaderSmoothScroll(wrapper, undefined);
    stopReaderSmoothScroll();
    expect(lenis.destroyed).toBe(true);
    expect(isSmoothScrollActive(SMOOTH_SCROLL_REASON.reader)).toBe(false);
    expect(wrapper.dataset.smoothScrollReason).toBeUndefined();
  });

  it("ignores a missing wrapper rather than throwing", async () => {
    await expect(startSmoothScroll("reader", {})).resolves.toBeNull();
  });

  it("does not attach to a container that left the document", async () => {
    const wrapper = { dataset: {}, isConnected: false };
    await expect(startSmoothScroll("landing", { wrapper })).resolves.toBeNull();
    expect(isSmoothScrollActive("landing")).toBe(false);
  });
});

describe("reader pacing", () => {
  it("keeps touch native and honours reduced motion", async () => {
    const wrapper = makeWrapper();
    await startReaderSmoothScroll(wrapper, undefined);
    const { options } = state.lenis;
    expect(options.syncTouch).toBe(false);
    expect(options.respectReducedMotion).toBe(true);
    expect(options.autoRaf).toBe(false);
  });

  it("scales the wheel delta so a gesture cannot skip paragraphs", async () => {
    const wrapper = makeWrapper();
    await startReaderSmoothScroll(wrapper, undefined);
    const event = { deltaY: 100 };
    state.lenis.options.virtualScroll(event);
    expect(event.deltaY).toBeLessThan(100);
    expect(event.deltaY).toBeGreaterThan(0);
  });
});

describe("nested scrollers", () => {
  it.each([
    "contents-list",
    "focus-card-chat-messages",
    "settings-scroll",
    "notes-list",
    "notes-bento-list",
  ])("excludes %s from smoothing", (className) => {
    expect(isNestedScroller(fakeNode([className]))).toBe(true);
  });

  it("finds a nested scroller further up the tree", () => {
    const inner = fakeNode(["chat-row"]);
    const scroller = fakeNode(["focus-card-chat-messages"], fakeNode([], BODY));
    const leaf = fakeNode(["span"], scroller);
    void inner;
    expect(isNestedScroller(leaf)).toBe(true);
  });

  it("does not exclude ordinary reader content", () => {
    expect(isNestedScroller(fakeNode(["reader-canvas", "paragraph"]))).toBe(false);
  });

  it("terminates on a self-referencing parent instead of looping", () => {
    const looping = { classList: [] };
    looping.parentElement = looping;
    expect(isNestedScroller(looping)).toBe(false);
  });

  it("passes the predicate to Lenis", async () => {
    const wrapper = makeWrapper();
    await startReaderSmoothScroll(wrapper, undefined);
    expect(typeof state.lenis.options.prevent).toBe("function");
  });
});

describe("programmatic scrolling", () => {
  it("routes through Lenis when the container is registered", async () => {
    const wrapper = makeWrapper();
    const lenis = await startReaderSmoothScroll(wrapper, undefined);
    const handled = scrollContainerTo(wrapper, 420, { behavior: "smooth" });
    expect(handled).toBe(true);
    expect(lenis.calls.at(-1)).toEqual({ target: 420, options: { immediate: false } });
  });

  it("marks instant scrolls so reduced-motion users are not animated", async () => {
    const wrapper = makeWrapper();
    const lenis = await startReaderSmoothScroll(wrapper, undefined);
    scrollContainerTo(wrapper, 100, { behavior: "auto" });
    expect(lenis.calls.at(-1).options.immediate).toBe(true);
  });

  it("falls back to native scroll for unregistered containers", () => {
    const wrapper = makeWrapper();
    const handled = scrollContainerTo(wrapper, 200, { behavior: "auto" });
    expect(handled).toBe(false);
  });

  it("never passes a negative target to Lenis", async () => {
    const wrapper = makeWrapper();
    const lenis = await startReaderSmoothScroll(wrapper, undefined);
    scrollContainerTo(wrapper, -80, { behavior: "smooth" });
    expect(lenis.calls.at(-1).target).toBe(0);
  });

  it("tolerates a null container", () => {
    expect(scrollContainerTo(null, 10)).toBe(false);
  });
});
