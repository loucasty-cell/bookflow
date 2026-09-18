---
title: Storage and Persistence
type: contract
status: verified
updated: 2026-09-18
tags: [bookflow, architecture, storage, persistence]
source-files: [src/shared/lib/storage.js, src/store/readerStore.js, src/features/reader/config.js, src/features/reader/hooks/useReaderPersistence.js]
---

# Storage and Persistence

## Layers

Bookflow stores three kinds of state, in three places, on purpose.

| Layer | Where | Lifetime | Contents |
| --- | --- | --- | --- |
| Global settings | `localStorage` via Zustand persist | Until cleared | Reader preferences |
| Document session | `localStorage` per identity | Until cleared | progress, chapter, pin, bookmarks, notes, scroll |
| Import working state | Memory only | Until import ends | Manifest units, buffers, job ids |

No book text is persisted. No document content leaves the device on the default path.

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
  "useProgressiveImport": true
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
  "activeChapter": 1,
  "pinnedId": "paragraph-1-3",
  "bookmarks": ["paragraph-0-2", "paragraph-1-3"],
  "notes": [
    { "id": 1691823000000, "quote": "Paragraph excerpt", "text": "User note" }
  ],
  "scrollTop": 1420
}
```

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

## Planned

- OPFS or IndexedDB storage adapter with fallback for large documents.
- Annotation export and import bundles for cross-device portability.
- Persistent library so recent books survive without the original file open.

Detail: [[Library and Reading Stats]], [[Notes and Bookmarks]], [[Roadmap MOC]].

Related: [[Privacy Model]], [[Data Flow]].