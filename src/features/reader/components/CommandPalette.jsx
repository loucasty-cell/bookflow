/**
 * CommandPalette: reach the reader's controls without leaving the paragraph.
 *
 * Focus containment, Escape and focus restoration are delegated entirely to
 * useModalFocus so the reader has one focus-trap implementation, not two.
 * The query is a local React string: it is never logged, stored or sent.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useModalFocus } from "../../../shared/lib/index.js";

/** Pure so it can be unit tested without a DOM. */
export function filterCommands(commands, query) {
  const list = Array.isArray(commands) ? commands : [];
  const needle = typeof query === "string" ? query.trim().toLowerCase() : '';
  if (!needle) return list;
  return list.filter((command) => {
    if (!command) return false;
    const label = typeof command.label === 'string' ? command.label.toLowerCase() : '';
    const keywords = Array.isArray(command.keywords)
      ? command.keywords.map((word) => String(word).toLowerCase())
      : [];
    return label.includes(needle) || keywords.some((word) => word.includes(needle));
  });
}

export function CommandPalette({ open, onClose, commands = [] }) {
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const returnFocusRef = useRef(null);
  const [query, setQuery] = useState('');

  useModalFocus({
    open,
    containerRef: panelRef,
    onClose,
    initialFocusRef: inputRef,
    returnFocusRef,
  });

  useEffect(() => {
    if (open) return;
    setQuery('');
  }, [open]);

  const visible = useMemo(() => filterCommands(commands, query), [commands, query]);

  const runCommand = useCallback(
    (command) => {
      if (!command) return;
      onClose?.();
      command.run?.();
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <div className="command-palette-backdrop" onClick={onClose} role="presentation">
      <div
        ref={panelRef}
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Reader commands"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="command-palette-input"
          type="text"
          value={query}
          autoComplete="off"
          spellCheck="false"
          placeholder="Search reader commands"
          aria-label="Search reader commands"
          aria-controls="reader-command-list"
          onChange={(event) => setQuery(event.target.value)}
        />

        <ul className="command-palette-list" id="reader-command-list" role="list">
          {visible.map((command) => (
            <li key={command.id} className="command-palette-item">
              <button
                type="button"
                className="command-palette-command"
                onClick={() => runCommand(command)}
              >
                {command.label}
              </button>
            </li>
          ))}
          {!visible.length && (
            <li className="command-palette-empty">No matching command</li>
          )}
        </ul>
      </div>
    </div>
  );
}
