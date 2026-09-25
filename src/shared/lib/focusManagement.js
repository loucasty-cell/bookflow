import { useEffect, useRef } from 'react';

const focusableSelector = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(focusableSelector)).filter(
    (element) => element.getAttribute('aria-hidden') !== 'true' && element.getClientRects().length > 0,
  );
}

function focusElement(element) {
  if (element && typeof element.focus === 'function') {
    element.focus();
  }
}

function restoreFocus(target) {
  const isVisible = target?.getClientRects?.().length > 0;
  const isHidden = target?.closest?.('[inert], [aria-hidden="true"]');
  if (target && target !== document.body && target.isConnected && isVisible && !isHidden && typeof target.focus === 'function') {
    focusElement(target);
    return;
  }
  focusElement(document.querySelector('[data-modal-fallback-focus]'));
}

export function useModalFocus({ open, containerRef, onClose, initialFocusRef, returnFocusRef }) {
  const onCloseRef = useRef(onClose);
  const returnFocusTargetRef = useRef(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return undefined;
    }

    const activeElement = typeof document === 'undefined' ? null : document.activeElement;
    if (!wasOpenRef.current) {
      returnFocusTargetRef.current = returnFocusRef?.current || activeElement;
    }
    wasOpenRef.current = true;

    const focusInitial = () => {
      const target = initialFocusRef?.current || getFocusableElements(containerRef.current)[0] || containerRef.current;
      focusElement(target);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(containerRef.current);
      if (!focusable.length) {
        event.preventDefault();
        focusElement(containerRef.current);
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !containerRef.current?.contains(current))) {
        event.preventDefault();
        focusElement(last);
      } else if (!event.shiftKey && (current === last || !containerRef.current?.contains(current))) {
        event.preventDefault();
        focusElement(first);
      }
    };

    const frame = window.requestAnimationFrame
      ? window.requestAnimationFrame(focusInitial)
      : window.setTimeout(focusInitial, 0);

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (window.cancelAnimationFrame && typeof frame === 'number') {
        window.cancelAnimationFrame(frame);
      } else {
        window.clearTimeout(frame);
      }
      if (wasOpenRef.current) {
        restoreFocus(returnFocusTargetRef.current);
        returnFocusTargetRef.current = null;
        wasOpenRef.current = false;
      }
    };
  }, [open, containerRef, initialFocusRef, returnFocusRef]);

  useEffect(() => {
    if (open) return;
    if (returnFocusTargetRef.current) {
      restoreFocus(returnFocusTargetRef.current);
      returnFocusTargetRef.current = null;
    }
  }, [open]);
}
