import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LensBar, LensBarPanel } from './LensBar.jsx';
import { LensBarMenu } from './LensBarMenu.jsx';
import { LensBarLauncher } from './LensBarLauncher.jsx';
import { memoryStorage } from '../../../shared/lib/index.js';

const IDLE_REQ = {
  status: 'idle',
  text: '',
  source: 'local',
  trimmed: false,
  send: vi.fn(),
  clear: vi.fn(),
  cancel: vi.fn(),
};

const UNDECIDED_CONSENT = {
  choice: null,
  needsDecision: true,
  choose: vi.fn(),
  consumeOnce: vi.fn(),
  ensure: vi.fn(),
  allowed: vi.fn(),
};

/**
 * LensBar portals to document.body, which does not exist in this DOM-less
 * test environment. The panel is the same tree, so it is rendered directly to
 * verify escaping and structure.
 */
function renderPanel(overrides = {}) {
  const props = {
    collapsed: false,
    setCollapsed: vi.fn(),
    question: '',
    setQuestion: vi.fn(),
    context: '',
    setContext: vi.fn(),
    menuOpen: false,
    setMenuOpen: vi.fn(),
    flipMenu: false,
    mode: 'smart',
    language: 'English',
    setMode: vi.fn(),
    setLanguage: vi.fn(),
    req: IDLE_REQ,
    consent: { ...UNDECIDED_CONSENT, needsDecision: false },
    selection: { current: '' },
    getParagraph: () => '',
    onSaveNote: vi.fn(),
    theme: 'light',
    submit: vi.fn(),
    onKeyDown: vi.fn(),
    gripProps: { role: 'button', tabIndex: 0, 'aria-label': 'Move assistant. Arrow keys move it; Shift for bigger steps.' },
    inputRef: { current: null },
    bodyRef: { current: null },
    ...overrides,
  };
  return renderToStaticMarkup(<LensBarPanel {...props} />);
}

describe('LensBarLauncher', () => {
  it('is a real button with an accessible name and no default-closing mousedown', () => {
    const markup = renderToStaticMarkup(<LensBarLauncher />);
    expect(markup).toContain('<button');
    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-label="Open assistant"');
    expect(markup).toContain('aria-haspopup="dialog"');
  });
});

describe('LensBarMenu', () => {
  const noop = () => {};

  function renderMenu(props = {}) {
    return renderToStaticMarkup(
      <LensBarMenu
        mode="smart"
        language="English"
        onMode={noop}
        onLanguage={noop}
        onSelection={noop}
        onParagraph={noop}
        onClose={noop}
        onFlip={noop}
        {...props}
      />
    );
  }

  it('is a labelled menu with the two context actions', () => {
    const markup = renderMenu();
    expect(markup).toContain('role="menu"');
    expect(markup).toContain('aria-label="Assistant options"');
    expect(markup).toContain('Use selection');
    expect(markup).toContain('Use current paragraph');
  });

  it('offers every declared mode as a checked radio item', () => {
    const markup = renderMenu();
    for (const label of ['Smart', 'Summarize', 'Explain simply', 'Translate', 'Define', 'Ask']) {
      expect(markup).toContain(label);
    }
    expect(markup).toContain('role="menuitemradio"');
    expect(markup.match(/aria-checked="true"/g)).toHaveLength(1);
  });

  it('hides the language field unless the mode is translate', () => {
    expect(renderMenu({ mode: 'smart' })).not.toContain('Translate into');
    const translated = renderMenu({ mode: 'translate' });
    expect(translated).toContain('Translate into');
    expect(translated).toContain('aria-label="Target language"');
  });

  it('uses real buttons, never links', () => {
    const markup = renderMenu();
    expect(markup).not.toContain('href=');
    expect(markup.match(/<button/g).length).toBeGreaterThanOrEqual(8);
  });
});

describe('LensBar structure', () => {
  it('renders nothing while closed', () => {
    expect(
      renderToStaticMarkup(<LensBar lens={{}} getParagraph={() => ''} />)
    ).toBe('');
  });

  it('is a labelled region that keeps Lenis from smoothing its scroll', () => {
    const markup = renderPanel();
    expect(markup).toContain('role="region"');
    expect(markup).toContain('aria-label="Reading assistant"');
    expect(markup).toContain('data-lenis-prevent');
  });

  it('carries the resolved theme and colour scheme', () => {
    expect(renderPanel({ theme: 'dark' })).toContain('data-lens-theme="dark"');
    expect(renderPanel({ theme: 'dark' })).toContain('color-scheme:dark');
    expect(renderPanel({ theme: 'light' })).toContain('data-lens-theme="light"');
  });

  it('offers a drag grip with an accessible name and keyboard affordance', () => {
    const markup = renderPanel();
    expect(markup).toContain('class="lens-grip"');
    expect(markup).toContain('Move assistant. Arrow keys move it; Shift for bigger steps.');
    expect(markup).toContain('tabindex="0"');
  });

  it('has a labelled input capped at the question limit and a send button', () => {
    const markup = renderPanel();
    expect(markup).toContain('aria-label="Ask about the selected passage"');
    // React's static renderer keeps the JSX casing for maxLength, so match loosely.
    expect(markup).toMatch(/maxlength="500"/i);
    expect(markup).toContain('aria-label="Send"');
  });

  it('shows the mode as the placeholder verb rather than a chip', () => {
    expect(renderPanel({ mode: 'smart' })).toContain('Ask about this');
    expect(renderPanel({ mode: 'summarize' })).toContain('Summarize this');
    expect(renderPanel({ mode: 'explain' })).toContain('Explain this simply');
    expect(renderPanel({ mode: 'translate' })).toContain('Translate this');
    expect(renderPanel({ mode: 'define' })).toContain('Define this');
    expect(renderPanel({ mode: 'unknown-mode' })).toContain('Ask about this');
  });

  it('renders the answer region as a polite live region', () => {
    expect(renderPanel()).toContain('aria-live="polite"');
  });

  it('disables send while loading and for ask with no question', () => {
    expect(renderPanel({ req: { ...IDLE_REQ, status: 'loading' } })).toContain('disabled');
    expect(renderPanel({ mode: 'ask', question: '' })).toContain('disabled');
    expect(renderPanel({ mode: 'ask', question: 'why?' })).not.toContain('disabled');
  });

  it('shows the context chip with a remove control only when text is attached', () => {
    expect(renderPanel({ context: '' })).not.toContain('lens-quote');
    const withQuote = renderPanel({ context: 'Call me Ishmael.' });
    expect(withQuote).toContain('lens-quote');
    expect(withQuote).toContain('aria-label="Remove attached text"');
  });

  it('collapses to a single round button', () => {
    const markup = renderPanel({ collapsed: true });
    expect(markup).toContain('data-collapsed');
    expect(markup).toContain('aria-label="Open assistant"');
    expect(markup).not.toContain('lens-input');
  });
});

describe('LensBar consent line', () => {
  it('asks once with all three choices before any cloud send', () => {
    const markup = renderPanel({ consent: UNDECIDED_CONSENT });
    expect(markup).toContain('Send this passage to Reading Lens?');
    expect(markup).toContain('Send once');
    expect(markup).toContain('Always');
    expect(markup).toContain('Keep local');
    expect(markup).toContain('aria-label="Allow sending this passage"');
  });

  it('disappears once a decision is recorded', () => {
    const markup = renderPanel({ consent: { ...UNDECIDED_CONSENT, needsDecision: false } });
    expect(markup).not.toContain('Send this passage to Reading Lens?');
  });
});

describe('LensBar safety', () => {
  it('never renders untrusted text as markup', () => {
    const markup = renderPanel({
      req: {
        ...IDLE_REQ,
        status: 'done',
        text: '<img src=x onerror=1><script>alert(1)</script>',
        source: 'local',
      },
    });
    expect(markup).not.toContain('<img');
    expect(markup).not.toContain('<script');
    expect(markup).toContain('&lt;img');
  });

  it('never uses dangerouslySetInnerHTML, innerHTML or eval in the feature', () => {
    const dir = new URL('.', import.meta.url);
    for (const file of ['LensBar.jsx', 'LensBarMenu.jsx', 'LensBarLauncher.jsx']) {
      const source = readFileSync(new URL(file, dir), 'utf8');
      expect(source, file).not.toMatch(/dangerouslySetInnerHTML/);
      expect(source, file).not.toMatch(/innerHTML/);
      expect(source, file).not.toMatch(/eval\(/);
    }
  });

  it('renders an answer as paragraphs split on blank lines', () => {
    const markup = renderPanel({
      req: { ...IDLE_REQ, status: 'done', text: 'First para.\n\nSecond para.' },
    });
    expect(markup).toContain('<p>First para.</p>');
    expect(markup).toContain('<p>Second para.</p>');
  });

  it('labels a local answer honestly and never claims a cloud source', () => {
    expect(renderPanel({ req: { ...IDLE_REQ, status: 'done', text: 'x', source: 'local' } })).toContain(
      'Offline answer (limited)'
    );
    expect(renderPanel({ req: { ...IDLE_REQ, status: 'done', text: 'x', source: 'cloud' } })).toContain(
      'From the selected text'
    );
  });

  it('offers the four answer actions only when there is an answer', () => {
    const done = renderPanel({ req: { ...IDLE_REQ, status: 'done', text: 'x' } });
    for (const label of ['Copy answer', 'Save as note', 'Regenerate', 'Clear answer']) {
      expect(done).toContain(`aria-label="${label}"`);
    }
    expect(renderPanel()).not.toContain('aria-label="Copy answer"');
  });

  it('reports a failure as an alert and says nothing was sent', () => {
    const markup = renderPanel({ req: { ...IDLE_REQ, status: 'error' } });
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Nothing was sent unless you allowed it.');
  });

  it('never writes the question or the answer to storage', () => {
    memoryStorage.clear();
    renderPanel({ question: 'SECRET QUESTION', req: { ...IDLE_REQ, status: 'done', text: 'SECRET ANSWER' } });
    const dump = memoryStorage.getItem('bookflow:lens-bar') ?? '';
    expect(dump).not.toContain('SECRET');
  });
});