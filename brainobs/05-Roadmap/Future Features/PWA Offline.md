---
title: PWA Offline
type: spec
status: planned
updated: 2026-09-18
tags: [bookflow, roadmap, pwa, offline, planned]
source-files: [Bookflowideas.md, improvements.md, vite.config.js, updateOCRdata.md]
---

# PWA Offline

Planned. Make Bookflow installable and fully functional offline, with durable storage for large
documents.

Status: **planned**. Bookflow is currently web-ready, not PWA-ready. Do not describe it as
installable or offline-capable until the manifest, service worker, and offline behaviour are all
implemented and tested.

## Store-readiness vocabulary

| Level | Requirement | Current |
| --- | --- | --- |
| Web-ready | Responsive app verified in browsers | Yes |
| PWA-ready | Manifest, icons, service worker, offline behaviour, install flow tested | No |
| Native-store-ready | Platform packaging, permissions, signing, store assets, device testing | No |
| Published | Accepted and available in a named store | No |

Detail: [[Ethical Guardrails]], [[Current State Matrix]].

## What is already favourable

The app is unusually well positioned for offline work:

| Existing advantage | Why it helps |
| --- | --- |
| Local parsing by default | No server needed to read |
| Local OCR asset plugin | Tesseract assets already served from the origin, no CDN |
| Safe storage wrapper | Degrades gracefully when storage is restricted |
| Relative base path | Deploys from any subpath |
| Vendor chunk splitting | Caching strategy has natural boundaries |

Detail: [[Frontend Architecture]], [[Privacy Model]].

## Build plan

### 1. Web app manifest

```text
name, short_name        Bookflow
start_url               Relative, matching base: './'
display                 standalone
theme_color             Match the paper theme
background_color        Match the paper surface
icons                   Maskable and standard at required sizes
```

### 2. Service worker

| Asset class | Strategy | Reason |
| --- | --- | --- |
| App shell and vendor chunks | Precache | Instant launch, offline |
| OCR worker and WASM assets | Precache or cache-first | Required for offline local OCR |
| English trained data | Cache-first | One-time download, then offline |
| Document files | Never cached by the service worker | User-owned files, privacy |
| Backend API | Network-only, never cached | OCR results must not persist |

The last two rows are the important ones. A service worker that caches documents would violate
the privacy model, and caching OCR responses would persist content the backend deliberately does
not keep.

### 3. Durable storage

```text
Problem   localStorage is not appropriate for large document data
Options   OPFS (Origin Private File System) first, IndexedDB as fallback
Detect    Feature-detect both, degrade to session-only with a clear message
Use       Cached parsed units keyed by document identity
Never     Store document text in a place it cannot be cleared by the user
```

Feature detection is mandatory rather than optional, per the File System API guidance the
project already cites.

Detail: [[Storage and Persistence]].

### 4. Install experience

| Requirement | Rule |
| --- | --- |
| Install prompt | Never automatic. Offered only after a completed reading session |
| Dismissal | Permanent for that device once declined |
| Copy | Explains offline reading and privacy, not "install our app" |

An install prompt before the user has read anything is a conversion attempt, not a service.

## Offline behaviour matrix

| Feature | Offline |
| --- | --- |
| Import PDF, EPUB, TXT, Markdown | Works |
| Native text extraction | Works |
| Local Tesseract OCR | Works, assets cached |
| Focus rail, notes, bookmarks | Works |
| Progress restore | Works |
| Backend OCR scan | Unavailable, with a clear message |
| Social resonance | Unavailable, hidden rather than broken |

## Acceptance criteria

- [ ] Manifest present with valid icons at all required sizes.
- [ ] Service worker precaches the app shell and OCR assets.
- [ ] App launches and reads fully with the network disabled.
- [ ] Local OCR completes offline.
- [ ] Document files are never cached by the service worker.
- [ ] Backend API responses are never cached.
- [ ] Install prompt appears only after a completed session and is permanently dismissible.
- [ ] Storage feature detection degrades with a clear message.
- [ ] Verified offline at 390x844 and on desktop.

Detail: [[Verification Checklist]], [[Testing Pipeline]].

Related: [[Future Features MOC]], [[Library and Reading Stats]], [[Feature Spec Template]].