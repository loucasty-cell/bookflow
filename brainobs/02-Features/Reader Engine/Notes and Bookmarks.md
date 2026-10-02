---
title: Notes and Bookmarks
type: feature
status: partial
updated: 2026-10-02
tags: [bookflow, reader, notes, bookmarks, annotations]
source-files: [src/features/reader/components/NotesPanel.jsx, src/features/reader/components/SelectionTooltip.jsx, src/features/reader/hooks/useReaderAnnotations.js, src/features/reader/hooks/useReaderPersistence.js, src/features/reader/lib/notesPdfExport.js, src/features/reader/lib/notesExport.js, src/store/readerStore.js, src/shared/lib/storage.js]
---

# Notes and Bookmarks

Annotations turn reading into something the reader keeps. They are stored locally against the
document identity.

Status: **partial**. Capture, persistence, in-panel search, and PDF notebook export are built.
Cross-chapter note consolidation and jump-to-quote are not implemented.

## Bookmarks

A bookmark is a paragraph id reference. `toggleBookmark(id)` in `readerStore.js` adds the id if
absent and removes it if present.

```text
bookmarks: ["paragraph-0-2", "paragraph-1-3"]
```

The bookmark count is surfaced in the reader chrome so progress and accumulated intent are both
visible.

## Margin notes

A note pairs a quoted excerpt with the reader's own text:

```json
{ "id": 1691823000000, "quote": "Paragraph excerpt...", "text": "User note" }
```

- `id` is a UUID when `crypto.randomUUID()` is available, otherwise a timestamp-based fallback.
- `quote` preserves the original excerpt, so a note remains meaningful even if the paragraph is
  later re-parsed.
- `addNote` prepends to the list. `deleteNote` filters by id.

## Selection tooltip

`SelectionTooltip.jsx` renders a floating toolbar above selected text with core actions:

| Action | Result |
| --- | --- |
| Note | Opens the note composer with the selection as the quote |
| Copy | Copies the selection to the clipboard |
| Bookmark | Bookmarks the containing paragraph |
| Define | Optional when `showDefinitionLookup` is enabled (`config.js:21`, default `false`); uses the local dictionary only |

The tooltip positions itself relative to the selection and stays inside the reader viewport.

## Persistence

Notes and bookmarks are part of the per-document session and are written through
`getStorageItem`/`setStorageItem` from `src/shared/lib/storage.js`, so private-browsing failures
degrade rather than throw.

`useReaderPersistence.js` touches four storage keys:

| Key | Written at | Contents |
| --- | --- | --- |
| `bookflow:notes-view-mode` | `NotesPanel.jsx:38` | `drawer` or `modal` panel preference |
| `bookflow:notes-bold-preference` | `NotesPanel.jsx:39` | `true`/`false` bold preference |
| `bookflow:quick-notes:{bookId}` | `NotesPanel.jsx:203`, `useReaderPersistence.js:44,71` | The note list, mirrored outside the document session |
| `documentStorageKey(bookId)` | `NotesPanel.jsx:204` | The full document session, including notes, bookmarks, progress, and active paragraph |

Two write paths exist on purpose:

- **Immediate** on notes change (`useReaderPersistence.js:30-33`), so a quick note is never lost to a
  pending throttle.
- **Throttled** at `PERSIST_THROTTLE_MS = 500` (`useReaderPersistence.js:15,74-78`) for the session
  fields that change continuously while scrolling. The timer is set for the remaining time in the
  window, not a flat 500 ms.

Pin state is transient and is not part of the persisted session.

Detail: [[Storage and Persistence]].

## Note search

In-panel search is **built**. `NotesPanel.jsx` holds `searchQuery` (`:156`), filters the note list
lowercased against it (`:396-406`), and renders a search field with a clear button (`:665-680`).
It also has an explicit empty state that says to try a different term (`:726`).

Search is scoped to the notes currently loaded in the panel. Cross-chapter note consolidation is not
implemented.

## Jump to quote

Not implemented. No jump-to-quote handler was found in `NotesPanel.jsx`, `SelectionTooltip.jsx`, or
`useReaderAnnotations.js`. A note cannot currently navigate back to its source paragraph.

Detail: [[Backlog P0-P1-P2]], [[Future Features MOC]].

## PDF notebook export

This is **built**, not planned. Two modules:

| Module | Lines | Role |
| --- | --- | --- |
| `src/features/reader/lib/notesPdfExport.js` | 744 | Layout planning, sanitisation, and `pdf-lib` document rendering |
| `src/features/reader/lib/notesExport.js` | shorter | Orchestration: status constants, filename sanitisation, blob download, failure messages |

Exports from `notesPdfExport.js`: `measureTextWidth` (`:96`), `sanitizePdfText` (`:132`),
`truncateToWidth` (`:163`), `wrapText` (`:193`), `planNotesPdfLayout` (`:288`),
`renderNotesPdfDocument` (`:669`), `buildNotesPdf` (`:716`), `exportNotesAsPdf` (`:724`).

Exports from `notesExport.js`: `NOTES_EXPORT_STATUS` (`:7`), `NOTES_EXPORT_FAILURE_MESSAGE` (`:14`),
`sanitizeFilename` (`:20`), `notesFilename` (`:34`), `revokePendingDownloads` (`:42`),
`downloadBlob` (`:53`), `describeNotesExportFailure` (`:92`), `describeReplacedGlyphs` (`:101`),
`runNotesPdfExport` (`:112`).

### A4 geometry

The document is A4 with fixed margins, so pagination is deterministic:

| Constant | Line | Value |
| --- | --- | --- |
| `PAGE_WIDTH` | `notesPdfExport.js:6` | `595.28` |
| `PAGE_HEIGHT` | `notesPdfExport.js:7` | `841.89` |
| `MARGIN_LEFT` / `MARGIN_RIGHT` | `:8-9` | `42` |
| `MARGIN_TOP` | `:10` | `42` |
| `MARGIN_BOTTOM` | `:11` | `46` |
| `USABLE_WIDTH` | `:12` | `PAGE_WIDTH - 42 - 42` |
| `BODY_SIZE` | `:24` | `10.5` |
| `BODY_LINE_HEIGHT` | `:25` | `15` |

An oversized note paginates rather than drawing below the bottom margin (`:286`).

### Cooperative yielding

Building a document for a large note set would otherwise lock the main thread. `yieldToHost`
(`notesPdfExport.js:81-90`) prefers `scheduler.yield()` and falls back to `setTimeout(resolve, 0)`
when the scheduler API is absent. It is called from two places:

- During layout planning, every `YIELD_INTERVAL_MS` of 12 ms (`:587-589`).
- During render, every `YIELD_OP_INTERVAL` of 240 operations (`:702-705`).

### WinAnsi sanitisation and the replaced-glyph report

`pdf-lib`'s standard fonts are WinAnsi-encoded, so unsupported characters would throw inside
`drawText`. `sanitizePdfText` (`:132`) substitutes rather than throws, using the `WINANSI_FALLBACK`
pattern at `:56-57` when the font exposes no `encodeText`.

Replacements are counted, not silently dropped: `replacedGlyphs` accumulates from the title, author,
chapter, and body (`:313,494`) and is returned in the plan (`:649`) and again from `buildNotesPdf`
(`:743`). `NotesPanel.jsx:106` surfaces it through `describeReplacedGlyphs`, so the reader learns
that glyphs were substituted instead of receiving a silently degraded notebook.

## Design rules

- Notes never block reading. The notes panel is summoned, not always present.
- Only one sheet is open at a time on mobile.
- The composer is dismissible with `Escape`.
- Closed panels are removed from the keyboard focus order.

Detail: [[Accessibility Rules]], [[Motion and Transitions]], [[Reader Engine MOC]].

## Known limitations

| Limitation | State |
| --- | --- |
| Annotation **import** bundle | Not implemented. Export to PDF exists; there is no re-import path |
| Cross-chapter note consolidation | Not implemented. Search covers the loaded list |
| Jump to quote | Not implemented. No handler found |
| Id-based anchoring | Re-parsing a reordered Markdown or EPUB can orphan annotations for that file |

These are tracked in [[Backlog P0-P1-P2]] and [[Future Features MOC]].