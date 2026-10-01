import React, { useCallback, useEffect, useRef } from 'react';

const MODES = [
  { id: 'smart', label: 'Smart' },
  { id: 'summarize', label: 'Summarize' },
  { id: 'explain', label: 'Explain simply' },
  { id: 'translate', label: 'Translate' },
  { id: 'define', label: 'Define' },
  { id: 'ask', label: 'Ask' },
];

/**
 * @param {object} props
 * @param {string} props.mode
 * @param {string} props.language
 * @param {(mode: string) => void} props.onMode
 * @param {(language: string) => void} props.onLanguage
 * @param {() => void} props.onSelection
 * @param {() => void} props.onParagraph
 * @param {() => void} props.onClose
 * @param {() => void} props.onFlip Change when the bar sits near the viewport top.
 */
export function LensBarMenu({
  mode,
  language,
  onMode,
  onLanguage,
  onSelection,
  onParagraph,
  onClose,
  onFlip,
}) {
  const rootRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (triggerRef.current) triggerRef.current.focus();
  }, []);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [onClose]);

  useEffect(() => {
    if (rootRef.current) {
      onFlip?.(rootRef.current.getBoundingClientRect().top < 220);
    }
  }, [onFlip]);

  const onKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      const items = [...(rootRef.current?.querySelectorAll('button, input') ?? [])];
      if (!items.length) return;
      const index = items.indexOf(document.activeElement);
      const next =
        event.key === 'ArrowDown'
          ? (index + 1) % items.length
          : (index - 1 + items.length) % items.length;
      items[next]?.focus();
    },
    [onClose],
  );

  return (
    <div
      ref={rootRef}
      className="lens-menu"
      role="menu"
      aria-label="Assistant options"
      onKeyDown={onKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        role="menuitem"
        className="lens-menu-item"
        onClick={onSelection}
      >
        Use selection
      </button>
      <button type="button" role="menuitem" className="lens-menu-item" onClick={onParagraph}>
        Use current paragraph
      </button>

      <div className="lens-menu-separator" role="separator" />

      {MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitemradio"
          aria-checked={mode === item.id}
          className="lens-menu-item"
          onClick={() => onMode(item.id)}
        >
          {item.label}
        </button>
      ))}

      {mode === 'translate' && (
        <label className="lens-menu-language">
          <span>Translate into</span>
          <input
            type="text"
            value={language}
            maxLength={40}
            aria-label="Target language"
            onChange={(event) => onLanguage(event.target.value)}
          />
        </label>
      )}
    </div>
  );
}

export { MODES as LENS_MENU_MODES };
