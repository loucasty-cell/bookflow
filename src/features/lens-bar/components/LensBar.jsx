import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, Copy, GripHorizontal, Plus, RotateCw, StickyNote, X } from 'lucide-react';
import { useLensBarStore } from '../store/lensBarStore.js';
import { useLensTheme } from '../hooks/useLensTheme.js';
import { useDraggableBar } from '../hooks/useDraggableBar.js';
import { MAX_QUESTION, useLensRequest } from '../hooks/useLensRequest.js';
import { useLensConsent } from '../hooks/useLensConsent.js';
import { useSelectionMemory } from '../hooks/useSelectionMemory.js';
import { LensBarMenu } from './LensBarMenu.jsx';
import '../lens-bar.css';

const VERB = {
  smart: 'Ask about this',
  summarize: 'Summarize this',
  explain: 'Explain this simply',
  translate: 'Translate this',
  define: 'Define this',
  ask: 'Ask about this',
};

/**
 * The presentational bar. Split from the portal wrapper so it can be rendered
 * to static markup in a DOM-less test and its escaping verified directly.
 */
export function LensBarPanel({
  collapsed,
  setCollapsed,
  question,
  setQuestion,
  context,
  setContext,
  menuOpen,
  setMenuOpen,
  flipMenu,
  setFlipMenu,
  mode,
  language,
  setMode,
  setLanguage,
  req,
  consent,
  selection,
  getParagraph,
  onSaveNote,
  theme,
  submit,
  noContext,
  onKeyDown,
  gripProps,
  inputRef,
  bodyRef,
}) {
  const quote = context ? (context.length > 90 ? `${context.slice(0, 90)}…` : context) : '';
  const needsQuestion = mode === 'ask' && !question.trim();

  return (
    <div
      ref={bodyRef}
      className="lens-bar"
      data-collapsed={collapsed || undefined}
      data-lens-theme={theme}
      style={{ colorScheme: theme }}
      role="region"
      aria-label="Reading assistant"
      data-lenis-prevent
      onKeyDown={onKeyDown}
    >
      {collapsed ? (
        <button
          type="button"
          className="lens-btn"
          aria-label="Open assistant"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setCollapsed(false);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
        >
          <Plus size={18} aria-hidden="true" />
        </button>
      ) : (
        <>
          <div className="lens-grip" {...gripProps}>
            <GripHorizontal size={14} aria-hidden="true" />
          </div>

          {quote && (
            <p className="lens-quote">
              <span>{quote}</span>
              <button
                type="button"
                aria-label="Remove attached text"
                onClick={() => setContext('')}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </p>
          )}

          <div className="lens-row">
            <button
              type="button"
              className="lens-btn"
              aria-label="Context and mode"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setMenuOpen((value) => !value)}
            >
              <Plus size={18} aria-hidden="true" />
            </button>
            <textarea
              ref={inputRef}
              rows={1}
              dir="auto"
              className="lens-input"
              value={question}
              maxLength={MAX_QUESTION}
              aria-label="Ask about the selected passage"
              placeholder={`${VERB[mode] ?? VERB.smart}…`}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button
              type="button"
              className="lens-btn lens-send"
              aria-label="Send"
              disabled={req.status === 'loading' || needsQuestion}
              onClick={submit}
            >
              <ArrowUp size={18} aria-hidden="true" />
            </button>
          </div>

          {consent.needsDecision && (
            <div className="lens-consent" role="group" aria-label="Allow sending this passage">
              <p>Send this passage to Reading Lens?</p>
              <div className="lens-consent-actions">
                <button type="button" onClick={() => consent.choose('once')}>
                  Send once
                </button>
                <button type="button" onClick={() => consent.choose('always')}>
                  Always
                </button>
                <button type="button" onClick={() => consent.choose('local')}>
                  Keep local
                </button>
              </div>
            </div>
          )}

          {menuOpen && (
            <LensBarMenu
              mode={mode}
              language={language}
              onMode={(next) => {
                setMode(next);
                setMenuOpen(false);
              }}
              onLanguage={setLanguage}
              onSelection={() => {
                setContext(selection.current);
                setMenuOpen(false);
              }}
              onParagraph={() => {
                setContext(getParagraph?.() || '');
                setMenuOpen(false);
              }}
              onClose={() => setMenuOpen(false)}
              onFlip={setFlipMenu}
            />
          )}

          <div className="lens-answer" aria-live="polite" data-flip={flipMenu || undefined}>
            {req.status === 'loading' && <p className="lens-muted">Thinking…</p>}
            {(req.status === 'needs-context' || noContext) && (
              <p className="lens-muted">Select a passage first.</p>
            )}
            {req.status === 'error' && (
              <p className="lens-error" role="alert">
                Could not answer. Nothing was sent unless you allowed it.
              </p>
            )}
            {req.status === 'done' && (
              <div>
                <p className="lens-muted">
                  {req.source === 'cloud'
                    ? 'From the selected text'
                    : 'Offline answer (limited)'}
                  {req.trimmed ? ' · trimmed to fit' : ''}
                </p>
                {req.text.split('\n\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
                <div className="lens-actions">
                  <button
                    type="button"
                    aria-label="Copy answer"
                    onClick={() => navigator.clipboard?.writeText(req.text).catch(() => {})}
                  >
                    <Copy size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Save as note"
                    onClick={() =>
                      onSaveNote?.({ text: req.text, passage: context || selection.current })
                    }
                  >
                    <StickyNote size={15} aria-hidden="true" />
                  </button>
                  <button type="button" aria-label="Regenerate" onClick={submit}>
                    <RotateCw size={15} aria-hidden="true" />
                  </button>
                  <button type="button" aria-label="Clear answer" onClick={req.clear}>
                    <X size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * @param {object} props
 * @param {ReturnType<import('../hooks/useLensRequest.js').useLensRequest>} props.lens
 *   The reader's single shared Reading Lens instance. Never a second hook.
 * @param {() => string} props.getParagraph
 * @param {(note: {text: string, passage: string}) => void} props.onSaveNote
 */
export function LensBar({ lens, getParagraph, onSaveNote }) {
  const { open, collapsed, ratio, mode, language, setCollapsed, setRatio, setMode, setLanguage } =
    useLensBarStore();
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [flipMenu, setFlipMenu] = useState(false);
  const [noContext, setNoContext] = useState(false);
  const input = useRef(null);
  const selection = useSelectionMemory();
  const req = useLensRequest({ lens });
  const consent = useLensConsent({ lens });
  const theme = useLensTheme();

  const { ref: bodyRef, gripProps } = useDraggableBar({
    ratio,
    setRatio,
    watch: `${req.text.length}:${req.status}:${collapsed}:${context ? 1 : 0}:${menuOpen ? 1 : 0}`,
  });

  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [question]);

  useEffect(() => {
    if (!open) setMenuOpen(false);
  }, [open]);

  const needsQuestion = mode === 'ask' && !question.trim();

  const submit = useCallback(async () => {
    if (req.status === 'loading' || needsQuestion) return;
    const ctx = context || selection.current;
    if (!ctx.trim()) {
      // Say so rather than doing nothing at all.
      setNoContext(true);
      return;
    }
    setNoContext(false);

    // Resolves once the reader has answered the consent line. Whether that
    // answer permits a cloud call is the shared hook's decision, not ours: it
    // answers locally on its own when consent was refused.
    await consent.ensure();
    await req.send({ mode, question, context: ctx, language });
    consent.consumeOnce();
  }, [req, needsQuestion, context, selection, consent, mode, question, language]);

  // The notice clears when the reader attaches different text. The selection
  // memory is a ref, so it is deliberately not a dependency.
  useEffect(() => {
    setNoContext(false);
  }, [context]);

  const onKeyDown = useCallback(
    (event) => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        if (menuOpen) setMenuOpen(false);
        else if (req.status !== 'idle') req.clear();
        else setCollapsed(true);
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        submit();
      }
    },
    [menuOpen, req, setCollapsed, submit],
  );

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <LensBarPanel
      collapsed={collapsed}
      setCollapsed={setCollapsed}
      question={question}
      setQuestion={setQuestion}
      context={context}
      setContext={setContext}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
      flipMenu={flipMenu}
      setFlipMenu={setFlipMenu}
      mode={mode}
      language={language}
      setMode={setMode}
      setLanguage={setLanguage}
      req={req}
      consent={consent}
      selection={selection}
      getParagraph={getParagraph}
      onSaveNote={onSaveNote}
      theme={theme}
      submit={submit}
      noContext={noContext}
      onKeyDown={onKeyDown}
      gripProps={gripProps}
      inputRef={input}
      bodyRef={bodyRef}
    />,
    document.body,
  );
}
