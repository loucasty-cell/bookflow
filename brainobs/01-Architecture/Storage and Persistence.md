---
title: Storage and Persistence
type: contract
status: verified
updated: 2026-09-25
tags: [bookflow, architecture, storage, persistence]
source-files: [src/shared/lib/storage.js, src/store/readerStore.js, src/features/reader/config.js, src/features/reader/hooks/useReaderPersistence.js, src/features/reader/hooks/useReaderSession.js, src/features/library/hooks/useReadingSession.js, src/features/library/lib/libraryStore.js, src/features/library/lib/durableStorage.js]
---

# Storage and Persistence

## Layers

Bookflow stores four kinds of state, in separate places, on purpose.

| Layer | Where | Lifetime | Contents |
| --- | --- | --- | --- |
| Global settings | `localStorage` via Zustand persist | Until cleared | Reader preferences |
| Document session | `localStorage` per identity | Until cleared | progress, chapter, pin, bookmarks, notes, scroll |
| Library metadata | `localStorage` under `bookflow:library` | Until cleared | title, author, progress, shelf, measured session totals |
| Import working state | Memory only | Until import ends | Manifest units, buffers, job ids |

A feature-local OPFS/IndexedDB adapter exists in `src/features/library/lib/durableStorage.js`, but
it is not yet wired into the app's document lifecycle. Its public API can store a caller-supplied
document or unit, but the active app lifecycle does not call it.

The active browser lifecycle does not persist book text. No document content leaves the device on
the default path.

## Global settings

Key: `bookflow-reader-storage` (Zustand persist name). Reader state key documented as
`bookflow:settings` in `api.md`; both refer to the settings store.

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
  "enableAnnualGoal": false,
  "annualGoalTarget": 12
}
```

Source of truth: `DEFAULT_SETTINGS` in `src/features/reader/config.js`.

Two behaviours protect users across releases:

1. `setSettings` re-merges over `DEFAULT_SETTINGS`, so a new preference appears with its
   default even for a user who saved an older settings object.
2. The persist `merge` function does the same merge on rehydrate.

That means adding a setting is a one-line change and never a migration.

## Document identity and session key

```text
documentId = filename:size:lastModified
key        = bookflow:document:{documentId}
```

`documentStorageKey(id)` in `src/shared/lib/storage.js` builds the key.

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

Chapter selection and pin state are currently transient in `useReaderSession`; they are not fields
written by `useReaderPersistence`.

Consequence worth stating plainly: editing a filename, changing file size, or touching the
modification time makes the app treat the file as a new document. Nothing is lost, but the
previous session is no longer matched.

## Safe storage wrapper

`getSafeStorage()` probes `localStorage` with a write and delete inside a `try`/`catch`. If it
throws, it returns an in-memory `Map` implementation with the same interface.

This matters in practice:

- Private or incognito windows where storage is blocked.
- Browsers with third-party storage restrictions.
- Server-side rendering, where `window` is undefined.

The helpers `getStorageItem`, `setStorageItem`, `removeStorageItem`, and `safeParse` wrap the
same fallback, and `safeParse` returns a supplied default instead of throwing on malformed JSON.

## Failure modes and behaviour

| Situation | Behaviour |
| --- | --- |
| Storage blocked | In-memory fallback, session-only persistence |
| Malformed stored JSON | `safeParse` returns the fallback value |
| Unknown settings keys | Ignored by the merge over defaults |
| New setting added | Default applies automatically |
| File edited | New identity, previous session unmatched |
| Markdown or EPUB reordered | Paragraph ids may shift, annotations can orphan |

## Library metadata

`libraryStore.js` stores versioned metadata under `bookflow:library`, bounds the collection at
60 entries, and records measured words, active reading time, sessions, notes, bookmarks, and
completion state. `useReadingSession` records the session on close, and `App.jsx` uses the most
recent honest in-progress entry for `ResumeCard`; the current card requests file re-selection
rather than reopening a handle.

## Planned

- Wire OPFS or IndexedDB storage into the document lifecycle if large-document persistence is
  still required.
- Add a recent-books shelf and file-handle reuse so a return does not require re-finding a file.
- Add annotation export and import bundles for cross-device portability.

Detail: [[Library and Reading Stats]], [[Notes and Bookmarks]], [[Roadmap MOC]].

Related: [[Privacy Model]], [[Data Flow]].