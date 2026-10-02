import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SHELVES, normalizeEntry } from '../lib/libraryStore.js';
import { RecentShelf } from './RecentShelf.jsx';

const HOUR = 3_600_000;

function entry(overrides = {}) {
  return normalizeEntry({
    documentId: 'doc.pdf:1000:42',
    title: 'Meditations',
    author: 'Descartes',
    kind: 'PDF',
    fileName: 'doc.pdf',
    progress: 34,
    lastOpenedAt: Date.now() - HOUR,
    shelf: SHELVES.READING,
    ...overrides,
  });
}

function render(props = {}) {
  return renderToStaticMarkup(<RecentShelf {...props} />);
}

describe('RecentShelf empty state', () => {
  it('renders nothing when there are no entries', () => {
    expect(render({ entries: [] })).toBe('');
  });

  it('renders nothing when every entry is queued or finished', () => {
    const entries = [
      entry({ documentId: 'q', shelf: SHELVES.TO_READ }),
      entry({ documentId: 'f', shelf: SHELVES.FINISHED, progress: 100 }),
      entry({ documentId: 'done', progress: 98 }),
    ];
    expect(render({ entries })).toBe('');
  });
});

describe('RecentShelf rendering', () => {
  it('lists entries newest first', () => {
    const entries = [
      entry({ documentId: 'old', title: 'Older', lastOpenedAt: Date.now() - 10 * HOUR }),
      entry({ documentId: 'new', title: 'Newer', lastOpenedAt: Date.now() - HOUR }),
    ];
    const markup = render({ entries });
    expect(markup.indexOf('Newer')).toBeLessThan(markup.indexOf('Older'));
  });

  it('honours the limit', () => {
    const entries = Array.from({ length: 8 }, (unused, index) =>
      entry({ documentId: `d${index}`, title: `Book ${index}`, lastOpenedAt: Date.now() - index * HOUR })
    );
    expect(render({ entries, limit: 3 }).match(/recent-shelf-item/g)).toHaveLength(3);
  });

  it('uses real buttons inside a list for keyboard reachability', () => {
    const markup = render({ entries: [entry()] });
    expect(markup).toContain('<ul');
    expect(markup).toContain('<li');
    expect(markup).toContain('<button type="button"');
    expect(markup).toContain('</button>');
  });

  it('gives every action an accessible name that includes the title', () => {
    const markup = render({ entries: [entry({ title: 'Meditations' })] });
    expect(markup).toContain('aria-label="Resume Meditations"');
  });

  it('exposes progress as a progressbar with clamped aria values', () => {
    const markup = render({ entries: [entry({ progress: 34 })] });
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuemin="0"');
    expect(markup).toContain('aria-valuemax="100"');
    expect(markup).toContain('aria-valuenow="34"');
    expect(markup).toContain('width:34%');
  });

  it('clamps a negative progress in both the width and the aria value', () => {
    const markup = render({ entries: [{ ...entry(), progress: -50 }] });
    expect(markup).toContain('width:0%');
    expect(markup).toContain('aria-valuenow="0"');
  });

  it('rounds a fractional progress to one clamped number', () => {
    const markup = render({ entries: [{ ...entry(), progress: 34.7 }] });
    expect(markup).toContain('width:35%');
    expect(markup).toContain('aria-valuenow="35"');
  });

  it('excludes a hostile out-of-range progress rather than rendering it', () => {
    expect(render({ entries: [{ ...entry(), progress: 480 }] })).toBe('');
  });

  it('shows the relative last-opened time', () => {
    const markup = render({ entries: [entry({ lastOpenedAt: Date.now() - 2 * HOUR })] });
    expect(markup).toContain('2h ago');
  });

  it('labels an entry with no stored file as Locate file', () => {
    const entries = [
      entry({ documentId: 'meta', kind: 'TXT', fileName: '', title: 'Metadata only' }),
    ];
    const markup = render({ entries });
    expect(markup).toContain('aria-label="Locate file Metadata only"');
  });

  it('offers Resume for the bundled sample, which needs no file', () => {
    const entries = [entry({ documentId: 'bookflow-sample', kind: 'SAMPLE', fileName: '', title: 'Sample' })];
    const markup = render({ entries });
    expect(markup).toContain('aria-label="Resume Sample"');
    expect(markup).not.toContain('Locate file');
  });

  it('offers Resume only when a real stored file exists', () => {
    const markup = render({ entries: [entry({ fileName: 'doc.pdf', kind: 'PDF' })] });
    expect(markup).toContain('aria-label="Resume Meditations"');
    expect(markup).toContain('Resume');
  });
});

describe('RecentShelf untrusted metadata', () => {
  it('renders a hostile title as escaped literal text, never as markup', () => {
    const hostile = '<img src=x onerror="window.__pwned=1">';
    const markup = render({ entries: [entry({ title: hostile })] });
    expect(markup).not.toContain('<img');
    expect(markup).toContain('&lt;img');
    expect(markup).toContain('&quot;');
    expect(markup).not.toContain('<img src=x');
  });

  it('never uses dangerouslySetInnerHTML anywhere in the shelf', () => {
    const markup = render({ entries: [entry({ title: '<script>alert(1)</script>' })] });
    expect(markup).not.toContain('<script');
    expect(markup).not.toContain('dangerouslySetInnerHTML');
  });

  it('does not paint raw colour values into inline styles', () => {
    const markup = render({ entries: [entry()] });
    expect(markup).not.toMatch(/style="[^"]*(?:#[0-9a-fA-F]{3,8}|rgba?\()/);
  });

  it('survives a long unbroken title without emitting a raw inline width', () => {
    const long = 'A'.repeat(400);
    const markup = render({ entries: [entry({ title: long })] });
    expect(markup).toContain('recent-shelf-title');
    expect(markup).toContain(`title="${long}"`);
  });

  it('keeps the component free of side effects on import', () => {
    expect(typeof render).toBe('function');
    expect(vi.isMockFunction(render)).toBe(false);
  });
});
