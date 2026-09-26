import { useEffect } from "react";
import { startReaderSmoothScroll, stopReaderSmoothScroll } from "./smoothScroll.js";

/**
 * Attaches Lenis to the reader's scroll container.
 *
 * `node` is tracked by a callback ref rather than read from an object ref
 * because React can swap the canvas element after mount. Reading
 * `containerRef.current` once at effect time binds Lenis to a node that is no
 * longer in the document, which silently disables smooth scrolling. Keying the
 * effect on the node itself guarantees attach and teardown always refer to the
 * same element.
 */
export function useReaderSmoothScroll(node, enabled = true) {
  useEffect(() => {
    if (!enabled || !node) return undefined;

    startReaderSmoothScroll(() => node, node.firstElementChild ?? undefined).catch(() => {
      if (node.dataset) delete node.dataset.smoothScrollReason;
    });

    return () => {
      stopReaderSmoothScroll();
      if (node.dataset) delete node.dataset.smoothScrollReason;
    };
  }, [node, enabled]);
}
