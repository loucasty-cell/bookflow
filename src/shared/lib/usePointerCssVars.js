import { useEffect, useRef } from 'react';

/**
 * Writes normalised pointer position to CSS custom properties instead of React state.
 *
 * Pointer position changes every frame, so driving it through state re-renders
 * the whole tree for the sake of one transform. Properties are written straight
 * to the node inside a single rAF, and are always defined so `var()` never
 * resolves to an empty value.
 */
export function usePointerCssVars({ xProperty = '--pointer-x', yProperty = '--pointer-y' } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const reducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const write = (x, y) => {
      element.style.setProperty(xProperty, x);
      element.style.setProperty(yProperty, y);
    };

    write('0', '0');
    if (reducedMotion) return undefined;

    let frame = 0;

    const apply = (event) => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      write(String((event.clientX - rect.left) / rect.width - 0.5), String((event.clientY - rect.top) / rect.height - 0.5));
    };

    const schedule = (event) => {
      const pending = event;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => apply(pending));
    };

    const reset = () => write('0', '0');

    element.addEventListener('pointermove', schedule, { passive: true });
    element.addEventListener('pointerleave', reset, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      element.removeEventListener('pointermove', schedule);
      element.removeEventListener('pointerleave', reset);
    };
  }, [xProperty, yProperty]);

  return ref;
}

export default usePointerCssVars;