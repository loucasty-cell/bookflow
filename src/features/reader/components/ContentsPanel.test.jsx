import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ContentsPanel } from './ContentsPanel.jsx';
import { PANEL_RATIO_DEFAULT } from '../lib/panelRatio.js';

function render(overrides = {}) {
  const props = {
    book: { title: 'The Art of Staying Curious', author: 'A. Reader', kind: 'text' },
    chapters: [{ title: 'Opening', paragraphs: [{ id: 'p1', text: 'One.' }] }],
    activeChapter: 0,
    minutes: 12,
    bookmarkCount: 2,
    progress: 40,
    sidebarOpen: true,
    sidebarCollapsed: false,
    setSidebarOpen: vi.fn(),
    setSidebarCollapsed: vi.fn(),
    jumpToChapter: vi.fn(),
    closeBook: vi.fn(),
    returnFocusRef: { current: null },
    panelRatio: PANEL_RATIO_DEFAULT,
    onPanelRatioChange: vi.fn(),
    ...overrides,
  };
  return renderToStaticMarkup(<ContentsPanel {...props} />);
}

const GRIP = 'contents-resize-grip';

// The suite runs in the node environment, so window is absent and the panel's
// lazy matchMedia initializer sees no window at all and reports desktop. These
// two helpers let a test state which side of the 900px boundary it wants
// instead of depending on that accident.
function withViewport(mobile, fn) {
  const previous = globalThis.window;
  globalThis.window = {
    matchMedia: (query) => ({ matches: mobile, media: query, addEventListener() {}, removeEventListener() {} }),
  };
  try {
    return fn();
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
}

afterEach(() => {
  if (globalThis.window === undefined) delete globalThis.window;
});

describe('ContentsPanel resize grip', () => {
  it('renders a focusable separator with a width readout on desktop', () => {
    const markup = withViewport(false, () => render());
    expect(markup).toContain(GRIP);
    expect(markup).toContain('role="separator"');
    expect(markup).toContain('aria-orientation="vertical"');
    expect(markup).toContain('aria-valuenow=');
    expect(markup).toContain('aria-valuemin=');
    expect(markup).toContain('aria-valuemax=');
    expect(markup).toContain('tabindex="0"');
  });

  it('names the grip so it is reachable without sight of it', () => {
    // The label has to carry the keys, because a separator announces its value
    // but not what the value controls.
    const markup = withViewport(false, () => render());
    expect(markup).toMatch(/aria-label="Resize navigator\.[^"]*Arrow keys[^"]*"/);
  });

  it('does not render when the panel is collapsed', () => {
    // A collapsed panel has no edge to drag against, and a focusable element
    // inside a display:none subtree is unreachable.
    expect(withViewport(false, () => render({ sidebarCollapsed: true }))).not.toContain(GRIP);
  });

  it('keeps the divider out of the mobile drawer', () => {
    // Below 900px the panel is an off-canvas dialog, so there is no split view
    // to divide.
    expect(withViewport(true, () => render())).not.toContain(GRIP);
  });
});

describe('ContentsPanel unchanged by the resize work', () => {
  it('still renders the navigator as a labelled landmark', () => {
    const markup = render();
    expect(markup).toContain('id="book-navigator"');
    expect(markup).toContain('aria-label="Book navigator"');
  });

  it('still renders every chapter as a navigation item', () => {
    const markup = render();
    expect(markup).toContain('aria-label="Chapter navigation"');
    expect(markup).toContain('Opening');
  });

  it('still escapes book metadata instead of injecting it', () => {
    const markup = render({
      book: { title: '<img src=x onerror=alert(1)>', author: 'A. Reader', kind: 'text' },
    });
    expect(markup).not.toContain('<img src=x');
    expect(markup).toContain('&lt;img');
  });
});