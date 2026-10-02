import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SHELVES, normalizeEntry } from '../lib/libraryStore.js';
import { ResumeCard } from './ResumeCard.jsx';

const HOUR = 3_600_000;

function entry(overrides = {}) {
  return normalizeEntry({
    documentId: 'doc.pdf:1000:42',
    title: 'Meditations',
    kind: 'PDF',
    fileName: 'doc.pdf',
    progress: 34,
    lastOpenedAt: Date.now() - 2 * HOUR,
    shelf: SHELVES.READING,
    ...overrides,
  });
}

function render(props = {}) {
  return renderToStaticMarkup(<ResumeCard entry={entry()} onReopen={vi.fn()} {...props} />);
}

describe('ResumeCard empty state', () => {
  it('renders nothing without an entry', () => {
    expect(renderToStaticMarkup(<ResumeCard entry={null} />)).toBe('');
  });

  it('renders nothing when the book was never opened', () => {
    expect(render({ entry: entry({ progress: 0 }) })).toBe('');
  });
});

describe('ResumeCard missing-source state', () => {
  it('states plainly that the file was not kept', () => {
    const markup = render({ entry: entry({ fileName: '' }), onReopen: vi.fn() });
    expect(markup).toContain('Bookflow kept your progress, not the file. Choose the same file to continue.');
  });

  it('offers Locate file rather than Resume when there is no source', () => {
    const markup = render({ entry: entry({ fileName: '' }), onResume: vi.fn(), onReopen: vi.fn() });
    expect(markup).toContain('Locate file');
    expect(markup).not.toContain('>Resume<');
  });

  it('does not claim the file is missing for a real stored file', () => {
    const markup = render({ entry: entry({ fileName: 'doc.pdf' }), onResume: vi.fn(), onReopen: vi.fn() });
    expect(markup).not.toContain('kept your progress, not the file');
  });

  it('treats the bundled sample as reopenable without a file', () => {
    const sample = entry({ documentId: 'bookflow-sample', kind: 'SAMPLE', fileName: '' });
    const markup = render({ entry: sample, onResume: vi.fn(), onReopen: vi.fn() });
    expect(markup).toContain('Resume');
    expect(markup).not.toContain('kept your progress, not the file');
  });

  it('omits the action entirely when no handler is supplied', () => {
    const markup = render({ entry: entry({ fileName: '' }), onReopen: undefined });
    expect(markup).not.toContain('Locate file');
    expect(markup).toContain('Dismiss notification');
  });
});

describe('ResumeCard presentation', () => {
  it('reuses the single relative-time vocabulary', () => {
    expect(render({ entry: entry({ lastOpenedAt: Date.now() - 2 * HOUR }) })).toContain('2h ago');
    expect(render({ entry: entry({ lastOpenedAt: Date.now() - 5000 }) })).toContain('just now');
  });

  it('clamps a fractional progress in the chip, the width and the aria value together', () => {
    const markup = render({ entry: { ...entry(), progress: 34.7 } });
    expect(markup).toContain('35% done');
    expect(markup).toContain('width:35%');
    expect(markup).toContain('aria-valuenow="35"');
  });

  it('renders nothing for a non-positive progress because nothing was read', () => {
    expect(render({ entry: { ...entry(), progress: -20 } })).toBe('');
  });

  it('keeps a 44px dismissal target and a real button type', () => {
    const markup = render();
    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-label="Dismiss notification"');
  });

  it('gives the card an accessible label', () => {
    expect(render()).toContain('aria-label="Resume reading notification"');
  });

  it('never paints a raw colour into inline styles', () => {
    expect(render()).not.toMatch(/style="[^"]*(?:#[0-9a-fA-F]{3,8}|rgba?\()/);
  });
});

describe('ResumeCard untrusted metadata', () => {
  it('escapes a hostile title instead of executing it', () => {
    const markup = render({ entry: entry({ title: '<img src=x onerror=1>' }) });
    expect(markup).not.toContain('<img');
    expect(markup).toContain('&lt;img');
  });

  it('escapes a hostile title inside the aria label', () => {
    const markup = render({ entry: entry({ title: '"><script>alert(1)</script>' }) });
    expect(markup).not.toContain('<script');
    expect(markup).toContain('&quot;&gt;');
  });
});
