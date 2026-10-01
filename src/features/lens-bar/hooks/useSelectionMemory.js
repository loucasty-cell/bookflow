import { useEffect, useRef } from 'react';

const MAX_MEMORY = 6000;

/**
 * Remembers the last non-collapsed selection inside the reader.
 *
 * Focusing the input clears the DOM selection, so the text has to be captured
 * before it is gone. The launcher and "+" buttons call preventDefault on
 * mousedown for the same reason.
 */
export function useSelectionMemory(containerSelector = '[data-reader-root]') {
  const lastRef = useRef('');

  useEffect(() => {
    const onChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const root = document.querySelector(containerSelector);
      const node =
        sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
      if (!root || !node || !root.contains(node)) return;
      const text = sel.toString().trim();
      if (text) lastRef.current = text.slice(0, MAX_MEMORY);
    };

    document.addEventListener('selectionchange', onChange);
    return () => document.removeEventListener('selectionchange', onChange);
  }, [containerSelector]);

  return lastRef;
}

export { MAX_MEMORY as LENS_SELECTION_MEMORY_LIMIT };
