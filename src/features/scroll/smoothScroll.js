const instances = new Map();
const owners = new Map();
const pending = new Map();

let gsapModule = null;
let lenisModule = null;
let tickerBound = false;

function bindTicker(gsap) {
  if (tickerBound) return;
  tickerBound = true;
  gsap.ticker.add((time) => {
    for (const lenis of instances.values()) {
      lenis.raf(time * 1000);
    }
  });
  gsap.ticker.lagSmoothing(0);
}

export const SMOOTH_SCROLL_REASON = {
  reader: "reader",
  landing: "landing",
};

/**
 * Sentence pacing: a wheel notch is roughly 100px, about three lines of body
 * text. Scaling the delta keeps one gesture from flinging the reader past
 * several paragraphs before the focus rail can settle.
 */
const READER_DELTA_SCALE = 0.55;

/**
 * Nested scrollers own their own scroll. Lenis must not smooth a wheel event
 * that happened inside one, or the list looks frozen while the page behind it
 * moves.
 */
const NESTED_SCROLL_CLASSES = [
  "contents-list",
  "focus-card-chat-messages",
  "settings-scroll",
  "notes-list",
  "notes-bento-list",
];

export function isNestedScroller(node) {
  const seen = new Set();
  let current = node;
  while (current && !seen.has(current)) {
    seen.add(current);
    const list = current.classList;
    if (list) {
      for (const name of Array.from(list)) {
        if (NESTED_SCROLL_CLASSES.includes(name)) return true;
      }
    }
    current = current.parentElement;
  }
  return false;
}

async function loadModules() {
  if (!gsapModule || !lenisModule) {
    const [gsap, lenis] = await Promise.all([import("gsap"), import("lenis")]);
    gsapModule = gsap.gsap ?? gsap.default ?? gsap;
    lenisModule = lenis.default ?? lenis;
  }
  return { gsap: gsapModule, Lenis: lenisModule };
}

export function getSmoothScroll(reason) {
  return instances.get(reason) ?? null;
}

export function isSmoothScrollActive(reason) {
  return instances.has(reason);
}

export async function startSmoothScroll(reason, { wrapper, getWrapper, content, deltaScale = 1 } = {}) {
  const resolveWrapper = () => (typeof getWrapper === "function" ? getWrapper() : wrapper);
  const initial = resolveWrapper();
  if (!initial) return null;
  const existing = instances.get(reason);
  if (existing) return existing;
  if (pending.has(reason)) return pending.get(reason);

  const task = (async () => {
    const { gsap, Lenis } = await loadModules();

    const target = resolveWrapper();
    if (instances.has(reason) || !target || target.isConnected === false) {
      return instances.get(reason) ?? null;
    }

    const prefersReduced = Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);

    const lenis = new Lenis({
      wrapper: target,
      content,
      lerp: 0.085,
      smoothWheel: true,
      syncTouch: false,
      respectReducedMotion: true,
      autoRaf: false,
      prevent: (node) => isNestedScroller(node),
      virtualScroll: (event) => {
        if (prefersReduced) return false;
        if (deltaScale !== 1 && event.deltaY !== undefined) {
          event.deltaY *= deltaScale;
        }
      },
    });

    instances.set(reason, lenis);
    owners.set(reason, target);
    // The marker is written after the attach so the element carrying it is
    // always the element Lenis is bound to, never a stale one.
    if (target.dataset) target.dataset.smoothScrollReason = reason;
    bindTicker(gsap);
    return lenis;
  })();

  pending.set(reason, task);
  try {
    return await task;
  } finally {
    pending.delete(reason);
  }
}

export function stopSmoothScroll(reason) {
  const lenis = instances.get(reason);
  if (!lenis) return;
  instances.delete(reason);

  const owner = owners.get(reason);
  owners.delete(reason);
  if (owner?.dataset && owner.dataset.smoothScrollReason === reason) {
    delete owner.dataset.smoothScrollReason;
  }

  lenis.destroy();
  if (instances.size === 0 && tickerBound && gsapModule) {
    gsapModule.ticker.clear();
    tickerBound = false;
  }
}

export function stopAllSmoothScroll() {
  for (const reason of Array.from(instances.keys())) {
    stopSmoothScroll(reason);
  }
}

/**
 * Programmatic scroll that cooperates with Lenis. Writing container.scrollTop
 * directly while Lenis is interpolating gets overwritten on the next frame.
 */
export function scrollContainerTo(container, top, { behavior = "smooth" } = {}) {
  if (!container) return false;

  const reason = container.dataset?.smoothScrollReason;
  const lenis = reason ? instances.get(reason) : null;

  if (!lenis) {
    if (typeof container.scrollTo === "function") {
      container.scrollTo({ top: Math.max(0, top), behavior });
    }
    return false;
  }

  lenis.scrollTo(Math.max(0, top), { immediate: behavior === "auto" });
  return true;
}

export function startReaderSmoothScroll(target, content) {
  const wrapper = typeof target === "function" ? target() : target;
  if (!wrapper) return Promise.resolve(null);
  if (wrapper.dataset) wrapper.dataset.smoothScrollReason = SMOOTH_SCROLL_REASON.reader;
  return startSmoothScroll(SMOOTH_SCROLL_REASON.reader, {
    wrapper,
    getWrapper: target,
    content,
    deltaScale: READER_DELTA_SCALE,
  });
}

export function stopReaderSmoothScroll() {
  stopSmoothScroll(SMOOTH_SCROLL_REASON.reader);
}
