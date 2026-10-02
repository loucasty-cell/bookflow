import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CommandPalette, filterCommands } from './CommandPalette.jsx';

const COMMANDS = [
  { id: 'notes', label: 'Open notes', keywords: ['margin'], run: vi.fn() },
  { id: 'settings', label: 'Reading settings', keywords: ['type', 'font'], run: vi.fn() },
  { id: 'navigator', label: 'Toggle navigator', keywords: ['contents'], run: vi.fn() },
  { id: 'home', label: 'Back to library', keywords: ['close', 'exit'], run: vi.fn() },
];

describe('filterCommands', () => {
  it('returns everything for an empty query', () => {
    expect(filterCommands(COMMANDS, '')).toHaveLength(4);
    expect(filterCommands(COMMANDS, '   ')).toHaveLength(4);
    expect(filterCommands(COMMANDS, undefined)).toHaveLength(4);
  });

  it('matches on the label, case insensitively', () => {
    expect(filterCommands(COMMANDS, 'NOTES').map((c) => c.id)).toEqual(['notes']);
    expect(filterCommands(COMMANDS, 'settings').map((c) => c.id)).toEqual(['settings']);
  });

  it('matches on keywords as well as labels', () => {
    expect(filterCommands(COMMANDS, 'font').map((c) => c.id)).toEqual(['settings']);
    expect(filterCommands(COMMANDS, 'contents').map((c) => c.id)).toEqual(['navigator']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterCommands(COMMANDS, 'zzz')).toEqual([]);
  });

  it('trims the query rather than matching stray whitespace', () => {
    expect(filterCommands(COMMANDS, '  notes  ').map((c) => c.id)).toEqual(['notes']);
  });

  it('survives a hostile commands payload', () => {
    expect(filterCommands(null, 'a')).toEqual([]);
    expect(filterCommands(undefined, 'a')).toEqual([]);
    expect(filterCommands('nope', 'a')).toEqual([]);
    expect(filterCommands([null, undefined, { id: 'x' }], 'a')).toEqual([]);
    expect(filterCommands(COMMANDS, 42)).toHaveLength(4);
  });

  it('does not mutate the source list', () => {
    const snapshot = COMMANDS.map((c) => c.id);
    filterCommands(COMMANDS, 'notes');
    expect(COMMANDS.map((c) => c.id)).toEqual(snapshot);
  });
});

describe('CommandPalette markup', () => {
  function render(props = {}) {
    return renderToStaticMarkup(<CommandPalette open commands={COMMANDS} onClose={vi.fn()} {...props} />);
  }

  it('renders nothing while closed', () => {
    expect(renderToStaticMarkup(<CommandPalette open={false} commands={COMMANDS} onClose={vi.fn()} />)).toBe('');
  });

  it('is a labelled modal dialog', () => {
    const markup = render();
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-label="Reader commands"');
  });

  it('puts focus in a labelled search field that owns the list', () => {
    const markup = render();
    expect(markup).toContain('aria-label="Search reader commands"');
    expect(markup).toContain('aria-controls="reader-command-list"');
    expect(markup).toContain('id="reader-command-list"');
  });

  it('renders every command as a real button inside a list', () => {
    const markup = render();
    expect(markup).toContain('role="list"');
    for (const command of COMMANDS) {
      expect(markup).toContain(`<button type="button" class="command-palette-command"`);
      expect(markup).toContain(command.label);
    }
  });

  it('states when nothing matches instead of rendering an empty box', () => {
    const markup = render();
    expect(markup).toContain('command-palette-list');
  });

  it('never auto-completes or persists the query', () => {
    const markup = render();
    expect(markup).toContain('autoComplete="off"');
    expect(markup).toContain('spellCheck="false"');
    expect(markup).not.toContain('localStorage');
  });

  it('reuses the shared focus helper rather than reimplementing a trap', () => {
    const source = readFileSync(new URL('./CommandPalette.jsx', import.meta.url), 'utf8');
    expect(source).toContain('useModalFocus');
    expect(source).not.toMatch(/addEventListener\(\s*['"]keydown/);
    expect(source).not.toMatch(/event\.key === ['"]Tab['"]/);
  });

  it('shows a shortcut only when the command declares one', () => {
    const withShortcut = [
      { id: 'notes', label: 'Open notes', shortcut: 'Ctrl B', run: vi.fn() },
    ];
    const shown = render({ commands: withShortcut });
    expect(shown).toContain('command-palette-shortcut');
    expect(shown).toContain('Ctrl B');

    // A command with no binding must not be given a guessed hint.
    const bare = render({ commands: COMMANDS });
    expect(bare).not.toContain('command-palette-shortcut');
  });

  it('keeps the shortcut out of the accessible name of the command', () => {
    const withShortcut = [
      { id: 'notes', label: 'Open notes', shortcut: 'Ctrl B', run: vi.fn() },
    ];
    const markup = render({ commands: withShortcut });
    // The label and the hint are separate elements, so a screen reader reading
    // the button announces the action rather than the action plus raw keys.
    expect(markup).toContain('<span class="command-palette-label">Open notes</span>');
    expect(markup).toContain('<kbd class="command-palette-shortcut">Ctrl B</kbd>');
  });
});
