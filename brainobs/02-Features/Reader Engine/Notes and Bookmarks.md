---
title: Notes and Bookmarks
type: feature
status: verified
updated: 2026-09-18
tags: [bookflow, reader, notes, bookmarks, annotations]
source-files: [src/features/reader/components/NotesPanel.jsx, src/features/reader/components/SelectionTooltip.jsx, src/store/readerStore.js, src/features/reader/hooks/useReaderPersistence.js]
---

# Notes and Bookmarks

Annotations turn reading into something the reader keeps. They are stored locally against the
document identity.

## Bookmarks

A bookmark is a paragraph id reference. `toggleBookmark(id)` in `readerStore.js` adds the id if
absent and removes it if present.

```text
bookmarks: ["paragraph-0-2", "paragraph-1-3"]
```

The bookmark count is surfaced in the reader chrome so progress and accumulated intent are
both visible.

## Margin notes

A note pairs a quoted excerpt with the reader's own text:

```json
{ "id": 1691823000000, "quote": "Paragraph excerpt...", "text": "User note" }
```

- `id` is a timestamp, so notes sort naturally newest first.
- `quote` preserves the original excerpt, so a note remains meaningful even if the paragraph
  is later re-parsed.
- `addNote` prepends to the list. `deleteNote` filters by id.

## Selection tooltip

`SelectionTooltip.jsx` renders a floating toolbar above selected text with three actions:

| Action | Result |
| --- | --- |
| Note | Opens the note composer with the selection as the quote |
| Copy | Copies the selection to the clipboard |
| Bookmark | Bookmarks the containing paragraph |

The tooltip positions itself relative to the selection and stays inside the reader viewport.

## Persistence

Notes and bookmarks are part of the per-document session, stored under
`bookflow:document:{documentId}`, restored by `useReaderPersistence` on open, and written back
with debouncing so they survive reloads and crashes.

Detail: [[Storage and Persistence]].

## Known limitations

| Limitation | Consequence |
| --- | --- |
| No export or import yet | Annotations are confined to one browser profile |
| No search across notes | Finding an old note means scrolling the notes panel |
| No jump to quote | A note cannot yet navigate back to its source paragraph |
| Id-based anchoring | Re-parsing a reordered Markdown or EPUB can orphan annotations for that file |

These are tracked in [[Backlog P0-P1-P2]] and [[Future Features MOC]].

## Design rules

- Notes never block reading. The notes panel is summoned, not always present.
- Only one sheet is open at a time on mobile.
- The composer is dismissible with `Escape`.
- Closed panels are removed from the keyboard focus order.

Detail: [[Accessibility Rules]], [[Motion and Transitions]].

## Planned improvements

- Annotation export and import bundles for portability.
- Note search and filter.
- Jump to quote.
- A recall prompt that resurfaces an old note at a relevant moment.

Related: [[Roadmap MOC]], [[Feature Spec Template]].