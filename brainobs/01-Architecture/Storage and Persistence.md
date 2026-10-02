---
title: Storage and Persistence
type: contract
status: verified
updated: 2026-10-02
tags: [bookflow, architecture, storage, persistence]
source-files: [src/shared/lib/storage.js,src/store/readerStore.js,src/features/reader/config.js,src/features/reader/hooks/useReaderPersistence.js,src/features/reader/hooks/useReaderSession.js,src/features/library/hooks/useReadingSession.js,src/features/library/lib/libraryStore.js,src/features/library/lib/readingGoals.js,src/features/library/lib/durableStorage.js,src/features/lens-bar/store/lensBarStore.js,src/features/reader/hooks/useReadingLens.js,src/features/reader/components/NotesPanel.jsx,src/App.jsx]
---

# Storage and Persistence

Bookflow persists state in four different browser mechanisms, for four different reasons. Mixing
them up is the easiest way to introduce a bug, so the split is spelled out first.

| Mechanism | Used for | Survives reload |
| --- | --- | --- |
| `localStorage` | 13 keys: settings, per-document session, library metadata, goals, badges, lens preferences, notes UI preferences | yes |
| **`sessionStorage`** | exactly one key: `bookflow:entry-intro-seen` | **no, dies with the tab** |
| `IndexedDB` | the durable adapter, when it is called | yes |
| Memory only | import manifest units, buffers, job ids, `memoryStorage` fallback | no |

The one `sessionStorage` key is intentional: the first-visit opening intro should reappear in a new
tab and not greet the user in a session they already had. `src/App.jsx:23` declares the constant,
`:300` writes `"true"`, `:313` reads it.

## The complete key inventory

Fifteen entries. Fifteen is a lot; this table is the reason it is a table.

| Key | Mechanism | Defined at | Holds | Shape owner |
| --- | --- | --- | --- | --- |
| `bookflow-reader-storage` | zustand `persist` | `src/store/readerStore.js:57` | **`settings` only** | `partialize`, see below |
| `bookflow:settings` | `localStorage` | `src/features/reader/hooks/useReaderPersistence.js:22` | the same settings object, mirrored on every settings change | `DEFAULT_SETTINGS` |
| `bookflow:document:{id}` | `localStorage` | `src/shared/lib/storage.js:65` (`documentStorageKey`) | per-document `progress`, `activeParagraphId`, `bookmarks`, `notes`, `scrollTop` | `useReaderPersistence` |
| `bookflow:quick-notes:{bookId}` | `localStorage` | `useReaderPersistence.js:44` and `:71`, `useReaderSession.js:90`, `NotesPanel.jsx:203` | the notes array alone | `useReaderPersistence` |
| `bookflow:library` | `localStorage` | `src/features/library/lib/libraryStore.js:13` | metadata index for resume and shelves | `libraryStore.js` |
| `bookflow:goals` | `localStorage` | `src/features/library/lib/readingGoals.js:15` | annual reading goal, enabled flag, target | `readingGoals.js` |
| `bookflow:awarded-badges` | `localStorage` | `src/features/library/hooks/useReadingSession.js:11` | ids of achievements already awarded | `useReadingSession` |
| `bookflow:lens-bar` | `localStorage` | `src/features/lens-bar/store/lensBarStore.js:15` | `ratio`, `mode`, `language` | `lensBarStore.js` |
| `bookflow:lens_quota` | `localStorage` | `src/features/reader/hooks/useReadingLens.js:10` | client-side mirror of the lens quota window | `useReadingLens.js` |
| `bookflow:lens_position` | `localStorage` | `useReadingLens.js:11` | lens panel position | `useReadingLens.js` |
| `bookflow:notes-view-mode` | `localStorage` | `src/features/reader/components/NotesPanel.jsx:38` | notes list or grid toggle | `NotesPanel.jsx` |
| `bookflow:notes-bold-preference` | `localStorage` | `NotesPanel.jsx:39` | bold-text preference for note rendering | `NotesPanel.jsx` |
| `bookflow:entry-intro-seen` | **`sessionStorage`** | `src/App.jsx:23`, `:300`, `:313` | first-visit intro flag | `App.jsx` |
| `bookflow-durable`, version 1 | **IndexedDB** | `src/features/library/lib/durableStorage.js:1-7` | object stores `DOCUMENTS` and `UNITS` | `durableStorage.js` |
| `bookflow-units` | **OPFS directory** | `durableStorage.js:138` | same records, when IndexedDB is unavailable | `durableStorage.js` |

Two things that look like keys and are not:

- `bookflow-sample` is a **document id literal**, used by `LandingPage.jsx`, `AppLandingView.jsx`,
  and `librarySelectors.js` to mark the bundled sample book.
- `bookflow:library-change` is a **window custom event**, not storage. `WidgetGrid.jsx:52` listens
  for it so the home widgets refresh when the library index changes in the same session.

## The partialize decision

This is the one thing to read twice, because it looks like a bug and is not.

`src/store/readerStore.js:72-74`:

```js
partialize: (state) => ({
  settings: state.settings
})
```

`readerStore` holds four pieces of state: `settings`, `progress`, `bookmarks`, `notes`. The store
is a single global Zustand store with a single persist key. `partialize` narrows the payload to
`settings` alone.

The reason is scope. `progress`, `bookmarks`, and `notes` are **per-document**, not global. They
are rehydrated by `useReaderPersistence` from `bookflow:document:{id}` whenever a book is opened.
If they were part of the persisted payload, opening book B after book A would hand B the progress
bar, bookmarks, and margin notes of A. `partialize` is what makes the global key safe to keep at all.

Consequence to state explicitly: **nothing in `readerStore` except `settings` reaches
`localStorage` through zustand.** Do not read `localStorage['bookflow-reader-storage']` expecting
notes.

Two adjacent guards in the same file:

- `merge` (lines 59-71) re-applies `DEFAULT_SETTINGS` on rehydrate, so a settings object written by
  an older build picks up new keys automatically. Adding a setting is a one-line change and never a
  migration.
- `merge` also passes `bookmarks` and `notes` through `normalizeArray`, so a hand-edited or
  poisoned `localStorage` value cannot inject a non-array into state.

`bookflow:settings` is a redundant mirror written on every settings change. It is what
`useReaderPersistence` uses for a non-Zustand read path; the Zustand key remains canonical.

## The settings payload

`DEFAULT_SETTINGS` in `src/features/reader/config.js` has **20 keys**. Earlier copies of this note
listed 19 because `progressDisplay` was dropped.

```json
{
  "fontSize": 19,
  "lineHeight": 1.9,
  "columnWidth": 1040,
  "focusPace": 240,
  "focus": "soft",
  "mode": "focus",
  "theme": "paper",
  "bionic": false,
  "fontFamily": "serif",
  "letterSpacing": "normal",
  "showRewardCapsules": false,
  "showInterventionModals": false,
  "useProgressiveImport": true,
  "showResumeCard": true,
  "showSessionRecap": false,
  "showAchievements": false,
  "showDefinitionLookup": false,
  "progressDisplay": "percent",
  "enableAnnualGoal": false,
  "annualGoalTarget": 12
}
```

Every opt-in surface defaults to off: bionic fixations, reward capsules, intervention modals,
session recap, achievements, definition lookup, annual goals. Only `useProgressiveImport` and
`showResumeCard` default to on.

## Document identity and the session key

```text
documentId = filename:size:lastModified
key        = bookflow:document:{documentId}
```

`documentId` comes from `src/shared/lib/text.js`; `documentStorageKey(id)` in
`src/shared/lib/storage.js:64` builds the key.

Session contents:

```json
{
  "progress": 42.5,
  "activeParagraphId": "paragraph-1-3",
  "bookmarks": ["paragraph-0-2", "paragraph-1-3"],
  "notes": [
    { "id": "note-id", "quote": "Paragraph excerpt", "text": "User note" }
  ],
  "scrollTop": 1420
}
```

`useReaderPersistence` writes in two paths:

- **Immediate**, whenever the `notes` array identity changes. This is so quick notes are saved
  without waiting for the scroll throttle.
- **Throttled**, at `PERSIST_THROTTLE_MS = 500`, for everything else. Progress ticks on every
  scroll, so an unthrottled write would hammer `localStorage`.

Chapter selection and the current pin are transient in `useReaderSession`. They are not session
fields and are not persisted.

Two honest limitations:

- Editing a filename, changing the file size, or touching the modification time makes the app treat
  the file as a **new document**. Nothing is lost, but the previous session is no longer matched.
- Re-parsing a changed Markdown or EPUB file can shift paragraph indices and orphan existing
  annotations. There is an open TODO in `useReaderPersistence.js:55` (`improvements-gap-4`) to
  replace paragraph-id anchors with quote selectors plus a normalized quote hash, resolve by exact
  location first with prefix and suffix fallback, show a "Review location" prompt on ambiguity, and
  store the parser version in the document metadata.

## Library metadata

`bookflow:library` stores a versioned metadata index. It never contains document text.

| Constant | Value |
| --- | --- |
| `LIBRARY_VERSION` | 1 |
| `MAX_LIBRARY_ENTRIES` | 60 |
| `FINISHED_PROGRESS` | 98 (progress at or above this counts as finished) |
| `SHELVES` | `READING: 'reading'`, `FINISHED: 'finished'`, `TO_READ: 'to-read'` |

`enforceCap` protects `TO_READ` entries from eviction, so the want-to-read queue is not consumed by
reading churn. `normalizeEntry` coerces counters to non-negative integers and falls back to
`SHELVES.READING` for an unrecognised shelf.

`useReadingSession` records the session on close. `App.jsx` uses `getResumeEntry` -- the single most
recently opened entry that is on the `READING` shelf and below `FINISHED_PROGRESS` -- for
`ResumeCard`. The current card asks the user to re-select the file; it does not hold a live file
handle.

`RecentShelf` exists in `src/features/library/components/` and is exported from the library barrel.
An earlier copy of this note listed "add a recent-books shelf" as planned work. It is implemented.

Detail: [[Library and Reading Stats]], [[Notes and Bookmarks]], [[Home Widgets]].

## The durable adapter, and why it is not on the live path

`src/features/library/lib/durableStorage.js` exports a full IndexedDB adapter with an OPFS fallback:

```js
DB_NAME    = 'bookflow-durable'
DB_VERSION = 1
STORES     = { DOCUMENTS: 'documents', UNITS: 'units' }
```

Resolution order: `isDurableStorageAvailable` checks IndexedDB first; `opfsStore()` opens the
`bookflow-units` directory via `navigator.storage.getDirectory()` when it is not.

**The app lifecycle does not call it.** Nothing in `App.jsx` or in the document-import path writes
a document or a unit to it today. Its public API can store a caller-supplied document or unit, and
that is all it currently does. Adapter presence is not persistence.

## The safe storage wrapper

`getSafeStorage()` writes and deletes a `__bf_storage_test__` probe key inside `try`/`catch`. On
throw it returns `memoryStorage`, an in-memory `Map` with the same interface.

This matters in practice:

- Private or incognito windows where storage is blocked.
- Browsers with third-party storage restrictions.
- Server-side rendering, where `window` is undefined.

`getStorageItem`, `setStorageItem`, `removeStorageItem`, and `safeParse` wrap the same fallback, and
`safeParse` returns a supplied default instead of throwing on malformed JSON. In-memory fallback
means the app runs fully, but session persistence is empty when the tab closes.

## Failure modes and behaviour

| Situation | Behaviour |
| --- | --- |
| Storage blocked | In-memory fallback; the app runs, session persistence is empty |
| Malformed stored JSON | `safeParse` returns the fallback value |
| Poisoned `bookmarks` or `notes` in the zustand key | `merge` normalises to an array |
| Unknown settings key in the zustand key | Dropped by the merge over `DEFAULT_SETTINGS` |
| New setting added | Default applies automatically, no migration |
| Lens bar payload is not an object, or is an array | `readLensBarPreferences` returns `{}` |
| Lens bar `ratio` is not two finite numbers | `safeRatio` returns `DEFAULT_RATIO` |
| Lens bar mode not in the allowlist | Falls back to `'smart'` |
| File renamed, resized, or touched | New identity; previous session unmatched |
| Markdown or EPUB reordered | Paragraph ids may shift; annotations can orphan |

## Still planned

- Wire OPFS or IndexedDB into the live document lifecycle if large-document persistence is
  eventually required.
- File-handle reuse, so a return visit does not require re-finding the file.
- Annotation export and import bundles for cross-device portability. `NotesPanel` already writes
  notes and the backend exposes `notes/export` and `notes/import`, but there is no bundle flow yet.

Detail: [[Privacy Model]], [[Data Flow]], [[Roadmap MOC]].