import { useEffect, useRef } from 'react';

/**
 * Drives a proximity value from the pointer's distance to an element.
 *
 * Same contract as usePointerCssVars: write CSS custom properties directly,
 * never React state. The value eases toward its target inside rAF and stops
 * scheduling frames once it settles, so an idle page costs nothing.
 *
 * @param {object} options
 * @param {string[]} options.properties Custom properties to write.
 * @param {(proximity: number) => Record<string, string>} options.format Maps a
 *   0..1 proximity to the property values.
 */
export function useProximityCssVars({
  properties = ['--proximity'],
  format = (value) => ({ '--proximity': value.toFixed(3) }),
  reachY = 320,
  reachXPadding = 120,
} = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof window === 'undefined') return undefined;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let rafId = 0;
    let target = 0;
    let current = 0;

    const write = (value) => {
      const values = format(value);
      for (const [property, resolved] of Object.entries(values)) {
        element.style.setProperty(property, resolved);
      }
    };

    const step = () => {
      current += (target - current) * 0.12;
      write(current);

      if (Math.abs(target - current) > 0.002 || target > 0.005) {
        rafId = requestAnimationFrame(step);
        return;
      }

      current = target;
      write(current);
      rafId = 0;
    };

    const schedule = () => {
      if (!rafId) rafId = requestAnimationFrame(step);
    };

    const measure = (event) => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const centerY = rect.top + rect.height / 2;
      const centerX = rect.left + rect.width / 2;
      const distY = Math.abs(event.clientY - centerY);
      const distX = Math.abs(event.clientX - centerX);

      if (distY >= reachY || distX >= rect.width / 2 + reachXPadding) {
        target = 0;
      } else {
        const normY = 1 - distY / reachY;
        const normX = 1 - Math.min(1, distX / (rect.width / 2 + reachXPadding));
        const raw = Math.max(0, Math.min(1, normY * normX));
        target = raw * raw * (3 - 2 * raw);
      }

      schedule();
    };

    const reset = () => {
      target = 0;
      schedule();
    };

    window.addEventListener('pointermove', measure, { passive: true });
    document.addEventListener('mouseleave', reset);

    return () => {
      window.removeEventListener('pointermove', measure);
      document.removeEventListener('mouseleave', reset);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [properties, format, reachY, reachXPadding]);

  return ref;
}

export default useProximityCssVars;