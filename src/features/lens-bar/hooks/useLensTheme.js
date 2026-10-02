import { useEffect, useState } from 'react';

/**
 * monocodex is a dark theme even though its name contains no dark keyword, so
 * the class list must name it explicitly. kyoto is light.
 */
const DARK = /(dusk|dark|night|monocodex)/i;

function detect() {
  if (typeof document === 'undefined') return 'light';
  const roots = [
    document.querySelector('[data-reader-root]'),
    document.documentElement,
    document.body,
  ];
  for (const el of roots) {
    if (!el) continue;
    const host = el.closest('[data-theme]') || el;
    const attr = host.getAttribute('data-theme');
    if (attr) return DARK.test(attr) ? 'dark' : 'light';
    if (DARK.test(host.className || '')) return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useLensTheme() {
  const [theme, setTheme] = useState(detect);

  useEffect(() => {
    const update = () => setTheme(detect());
    const mo = new MutationObserver(update);
    const opts = { attributes: true, attributeFilter: ['data-theme', 'class'] };

    mo.observe(document.documentElement, opts);
    if (document.body) mo.observe(document.body, opts);
    const reader = document.querySelector('[data-reader-root]');
    if (reader) mo.observe(reader, opts);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    update();

    return () => {
      mo.disconnect();
      mq.removeEventListener('change', update);
    };
  }, []);

  return theme;
}

export { detect as detectLensTheme };
