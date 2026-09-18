# Bookflow Critical Gaps and 8-Week Improvement Plan

**Scope:** A practical code-quality, product-quality, reliability, and performance plan for `loucasty-cell/bookflow`.

**Purpose:** Identify the highest-leverage gaps likely to make the product materially more usable and production-ready. “50% improvement” is not claimed as a measured outcome: it is a prioritization label for changes that can plausibly improve major user outcomes such as time-to-first-readable-content, successful imports, responsiveness, retention, and defect escape rate. Baselines must be measured before any percentage claim.

## Executive verdict

Bookflow already has a stronger foundation than a typical student prototype: local-first design rules, React/Vite frontend, feature folders, PDF/EPUB/TXT/Markdown import, PDF.js, Tesseract.js, an optional FastAPI/PaddleOCR route, reader focus logic, notes/bookmarks/settings, and meaningful unit tests are present in the repository. The critical weakness is not lack of ideas; it is the gap between a rich prototype and a production-grade document system: a very large root UI/state surface, eager or insufficiently observable document processing risk, limited end-to-end quality gates, incomplete persistence/storage strategy for large books, and no demonstrated benchmark/telemetry/release discipline. [file:1][file:2][file:3]

The recommended order is: **measure first, modularize the core reader/import path, make document processing cancellable and progressive, add end-to-end reliability testing, then build premium polish.** This avoids spending two months on visuals while import failure, long-book performance, and regression risk remain unsolved.

## Repository snapshot

The repository has a React/Vite frontend with `App.jsx` around 39 KB and a global stylesheet around 107 KB. It separates document import and reader folders, but many core reading behaviors still converge in the root composition layer, creating a likely future bottleneck for feature changes and regression isolation. [cite:1]

The reader has focused components—contents, focus card, notes, selection tooltip, settings, reading guide—and unit-tested helper modules for focus eligibility, focus rail, viewport behavior, reading controls, reading time, salience formatting, text formatting, and scroll position. This is a positive base; the next gap is integration-level verification of real reading flows. [cite:1]

The importer already contains parsers for PDF, EPUB, text, validation, and OCR, while the backend contains FastAPI endpoints, an OCR worker, and tests for OCR, accelerated OCR, documents, reader utilities, and configuration. The codebase therefore needs hardening and orchestration more than a wholesale rewrite. [cite:1][file:2]

## What premium readers do differently

High-quality reading products consistently protect four things: fast first content, stable reading position, resilient offline/persistent state, and invisible background work. For example, a Kindle-style system-design model separates library, reader, and sync responsibilities, pre-renders nearby content off-thread, caches visible content, and reduces background work while reading. Treat this as a design pattern rather than an implementation claim about Amazon internals. [web:35]

Mature open-source projects also invest heavily in quality gates. Calibre-Web’s development model combines unit/system tests, static analysis, and security/vulnerability practices rather than relying only on manual verification. [web:44]

For browser PDF workloads, a high-performance pattern is to cancel stale render work during fast navigation and move eligible canvas work off the main thread using workers or `OffscreenCanvas`; this prevents a document task from making the interface feel frozen. [web:50]

| Premium characteristic | What it changes for users | Current Bookflow signal | Gap to close |
| --- | --- | --- | --- |
| Clear domain boundaries | Safer changes and fewer regressions | Feature directories exist, but `App.jsx` is large | Extract orchestration into dedicated domain hooks/stores |
| Progressive content pipeline | Reader opens before full processing ends | OCR and parsing exist, but product proof of priority/cancel/cache flow is incomplete | Build manifest + scheduler + cache + cancellation |
| Stable anchors | Reliable resume, notes, links, and search | Paragraph identity/progress contracts exist | Add versioned anchors, migrations, quote hashes, and source provenance |
| E2E reliability gates | Fewer broken imports and reader flows | Unit tests and backend tests exist | Add Playwright/Cypress E2E, fixtures, visual/accessibility checks |
| Performance budgets | Fast experience stays fast after changes | No demonstrated performance budget/CI regression gate | Add bundle, memory, interaction, and import targets |
| Offline storage discipline | Large books survive reloads and failures | localStorage contracts are documented | Add IndexedDB/OPFS adapter and eviction policy |
| Observability | Bugs become reproducible | Debug docs exist, but no structured client job traces are evident | Add local diagnostic timeline and consented error reporting |
| Accessible low-distraction UI | More people can read for longer | Strong accessibility intentions in AGENTS.md | Verify with automated and manual accessibility checks |

## Critical gap 1: Root component concentration

### Why it matters

A 39 KB `App.jsx` and a 107 KB stylesheet are not automatically bad, but they are strong warning signals in an app that will add progressive loading, OCR states, storage, sessions, AI assistance, and reader modes. Large central files increase merge conflicts, make agent changes riskier, cause broad re-renders, and hide business rules inside UI composition. [cite:1]

### Expected impact

This is a high-leverage engineering fix because it reduces regression probability across almost every planned feature. It is not a user-visible “50% faster” claim; it enables safer delivery of the other high-impact work.

### Target architecture

```text
src/features/library/
  components/LibraryPage.jsx
  hooks/useLibraryImport.js
  store/libraryStore.js

src/features/document-import/
  lib/documentManifest.js
  lib/importCoordinator.js
  lib/importScheduler.js
  lib/documentCache.js

src/features/reader/
  hooks/useReaderSession.js
  hooks/useReaderNavigation.js
  hooks/useReaderPersistence.js
  components/ReaderShell.jsx
  components/ReaderViewport.jsx
  components/ReaderChrome.jsx

src/features/annotations/
  store/annotationStore.js
  lib/anchorResolver.js

src/shared/
  storage/
  telemetry/
  testing/
```

### Steps

1. Profile `App.jsx` with React DevTools before changing it; identify renders triggered by scroll, focus, notes, settings, and OCR progress.
2. Write characterization tests for current import, resume, note, bookmark, settings, keyboard, and touch behavior.
3. Extract pure derivation functions first: chapter enrichment, paragraph indexing, progress calculation, and reader state mapping.
4. Extract state into feature-specific Zustand slices or hooks; UI components should consume narrow selectors, not a large root object.
5. Move reader page composition into `ReaderShell` and import coordination into `useLibraryImport`.
6. Delete duplicated state after the new source of truth is proven; do not run two competing stores long-term.
7. Add render-count tests or profiling checks for high-frequency reader components.

### Test gates

- Existing unit tests remain green.
- Importing the same fixture produces the same normalized book object before and after refactor.
- Notes, bookmarks, scroll position, and settings survive refresh.
- Changing font size must not re-render every unrelated library card.
- Scrolling must not trigger full application re-renders.

## Critical gap 2: No proven progressive job scheduler

### Why it matters

A scanned 200-page PDF is the product’s hardest realistic workload. If Bookflow eagerly renders/OCRs many pages, it can create long waits, memory spikes, unresponsive UI, battery drain, and cancelled reading sessions. The repository’s own development guide correctly calls for lazy parsing and bounded concurrency, but that policy needs to become a visible job-state architecture with cancellation, prioritization, retry, and cache behavior. [file:1]

Browser-PDF guidance specifically recommends cancelling pending page renders during rapid navigation and using worker/off-main-thread rendering in performance-sensitive cases. [web:50]

### Expected impact

This is the most likely change to significantly improve time-to-first-readable-content and perceived quality for scans and large books. It should be measured as an outcome, not promised as a generic percentage.

### Target design

```text
User selects file
  -> validate file
  -> create manifest immediately
  -> extract title/page count/basic structure
  -> make first reading unit ready
  -> schedule current + next 2 units
  -> persist each completed unit
  -> prefetch low-priority work only while idle
  -> cancel stale work when user jumps
```

```ts
type JobPriority = 'CURRENT' | 'NEXT' | 'PREVIOUS' | 'BACKGROUND';
type UnitStatus = 'UNSEEN' | 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED' | 'CANCELLED';

interface ProcessingJob {
  id: string;
  documentId: string;
  unitId: string;
  priority: JobPriority;
  status: UnitStatus;
  attempt: number;
  abortController: AbortController;
  createdAt: number;
}
```

### Steps

1. Add a `DocumentManifest` created before full parsing: document ID, file metadata, format, page count/section count, and per-unit state.
2. Introduce an `ImportCoordinator` that selects parser/OCR strategy but does not directly render UI.
3. Implement a concurrency-limited scheduler: default 1 on low-memory/mobile, 2–3 on mainstream devices, configurable after benchmarks.
4. Assign priority from reader position: current unit first, then next two, then previous unit, then background.
5. Support `AbortController` across frontend fetches, worker tasks, and backend job streams; ignore stale completion messages by job version.
6. Call PDF.js cleanup/release paths after rendering a page; avoid retaining raw canvases and image blobs indefinitely.
7. Persist completed normalized units before scheduling distant work.
8. Add retry only for transient failures; classify unsupported/corrupt pages as terminal failures with an original-PDF fallback.
9. Display exact status: `Reading page 4 now`, `Preparing page 5`, `OCR failed on page 6`, rather than a fake global percentage.

### Test gates

- A 200-page simulated manifest renders the first unit without waiting for all 200 jobs.
- Jumping from page 2 to page 100 cancels or deprioritizes stale jobs.
- Only the configured maximum number of OCR jobs are active.
- A failed page does not prevent reading completed pages.
- Reload resumes from persisted completed work.
- No state update occurs after component unmount or job cancellation.

## Critical gap 3: Storage is too small for premium-scale documents

### Why it matters

The documented persistence layer uses `localStorage` for settings and per-document reading state. That is appropriate for small settings and anchors, but it is not sufficient for parsed book chunks, OCR outputs, thumbnails, images, or robust offline recovery. [file:2]

The File System API and origin-private storage capabilities can support user-selected file interaction and durable app data, but availability and permission must be feature-detected with fallbacks. [web:19]

### Expected impact

A durable storage layer materially improves reliability: users do not need to re-OCR a book after refresh, navigation becomes quicker, and large-book support becomes credible.

### Target storage policy

| Data | Primary storage | Fallback | Retention |
| --- | --- | --- | --- |
| Settings, lightweight preferences | localStorage | In-memory | Persistent |
| Reading anchors, notes, bookmarks | IndexedDB | localStorage | Persistent/exportable |
| Manifest and unit status | IndexedDB | In-memory | Persistent |
| Parsed/OCR text chunks | OPFS | IndexedDB | LRU-managed |
| Page raster cache | OPFS | Do not persist on constrained devices | LRU-managed |
| Original book file | User file handle when available | Require re-import | Never silently duplicate huge files |
| Debug traces | IndexedDB, user-controlled | None | Delete/export controls |

### Steps

1. Create a storage interface, not direct `localStorage` calls scattered through components.
2. Version every stored record and build a migration test suite.
3. Use a stable document ID: file metadata plus a content hash derived incrementally where practical.
4. Persist annotations against source page, paragraph ID, normalized quote hash, and character offsets.
5. Add a quota-aware cache manager with LRU eviction and a user-visible `clear cached books` control.
6. Add encrypted-at-rest only if your deployment model and threat model can support it correctly; do not advertise it without implementation.
7. Implement export/import of notes and reading state as JSON with schema validation.

### Test gates

- Reload retains progress/notes for a large document.
- Migrating from existing `bookflow:document:*` records preserves user data.
- Storage quota errors show a recovery action rather than crashing import.
- Cache eviction does not delete annotations or manifest metadata.
- Corrupt cached OCR chunks are rejected and rebuilt safely.

## Critical gap 4: Anchor and annotation durability

### Why it matters

Premium readers make highlights and notes feel permanent. A paragraph ID such as `paragraph-{chapterIndex}-{paragraphIndex}` is helpful, but it can become invalid when OCR retries, parsing algorithms change, EPUB structure changes, or a user imports a revised file. The existing contract provides IDs, notes, bookmarks, progress, and scroll position; the next quality bar is resilient anchoring. [file:2]

### Target anchor model

```ts
interface TextAnchor {
  documentId: string;
  parserVersion: string;
  source: { kind: 'pdf' | 'epub' | 'text' | 'markdown'; page?: number; spineIndex?: number };
  paragraphId: string;
  startOffset: number;
  endOffset: number;
  exactQuote: string;
  prefix: string;
  suffix: string;
  normalizedQuoteHash: string;
}
```

### Steps

1. Keep the existing paragraph ID for speed but add quote selectors and source provenance.
2. Resolve anchors by exact location first; fall back to quote hash plus nearby prefix/suffix matching.
3. When resolution is uncertain, show `Review location` instead of silently attaching a note to wrong text.
4. Store parser version and OCR model/version in document metadata.
5. Add an annotation repair report after reprocessing a document.

### Test gates

- Notes survive a line-break normalization change.
- Notes survive a paragraph re-split when the quote remains present.
- Ambiguous matches never silently resolve to a random location.
- Export/import round-trip preserves anchors and text quotes.

## Critical gap 5: Test pyramid lacks real user flows

### Why it matters

The repository has meaningful unit tests and backend pytest coverage, but a document reader fails most often at boundaries: file selection to reader, PDF worker configuration, browser storage, keyboard navigation, text selection, modal focus, backend disconnection, cancelled OCR, and mobile viewport behavior. Unit tests cannot prove these flows alone. [file:1][file:2]

Mature application quality practices combine unit tests with system/browser tests and static/security controls. [web:44]

### Recommended testing stack

| Layer | Purpose | Required examples |
| --- | --- | --- |
| Unit tests | Pure logic correctness | Segmentation, anchors, queue ordering, OCR quality heuristics |
| Component tests | UI behavior in isolation | Reader controls, settings persistence, status messages |
| Integration tests | Feature boundaries | Import coordinator + cache + scheduler + reader state |
| E2E browser tests | Real user workflows | Import PDF, resume, annotate, cancel OCR, mobile navigation |
| Visual regression | Layout stability | Reader themes, 320px viewport, long title, error states |
| Accessibility tests | Semantics and keyboard behavior | Modal focus, contrast, labels, reduced motion |
| Performance tests | User-perceived responsiveness | First content time, long-book navigation, bundle budget |
| Security tests | Untrusted files/inputs | ZIP traversal, malicious filename, oversized input, XSS payload |

### Steps

1. Add Playwright with Chromium first; add WebKit/mobile emulation after the core suite is stable.
2. Create legally usable fixture documents under `tests/fixtures/`; no copyrighted books.
3. Build E2E scenarios around outcomes, not implementation details.
4. Add an accessibility scanner such as axe-core to reader, uploader, settings, and modal flows.
5. Run E2E tests in CI for pull requests; quarantine only genuinely flaky tests with a written owner and expiry date.
6. Add screenshot snapshots for 320px, 768px, and desktop widths in light/dark/reduced-motion states.
7. Add regression tests for each fixed bug before closing it.

### Minimum E2E suite

```text
1. Import a text PDF and reach a readable first paragraph.
2. Import a scanned PDF and show progressive OCR status.
3. Cancel OCR, then continue reading ready pages.
4. Add a note, reload, and verify anchor restoration.
5. Change font/theme/focus, reload, and verify persistence.
6. Navigate using keyboard, touch, and screen-reader-visible controls.
7. Open a long book, jump far ahead, and verify no blocked UI.
8. Remove backend availability and verify local fallback/error recovery.
9. Use 320px width with no horizontal scrolling.
10. Use reduced motion with no essential action dependent on animation.
```

## Critical gap 6: No explicit performance budget or profiler loop

### Why it matters

A premium feel is primarily consistency: quick startup, predictable page changes, no scroll jank, and no surprise memory crash. React guidance emphasizes measuring before optimization, then using targeted code splitting, memoization, and virtualization for long lists rather than applying memoization everywhere. [web:52][web:56]

The current project already lazily loads some modal components, which is useful. The next step is to define measurable budgets, inspect the production bundle, and make regressions fail in CI rather than being noticed after deployment. [file:1]

### Initial budgets

| Area | Initial beta budget | How to measure |
| --- | --- | --- |
| First content UI | Under 1 s after file selection on representative laptop | Performance marks |
| First native-text unit | Under 2 s on fixture PDF | E2E metrics |
| UI long task | No task above 100 ms during ordinary reading | PerformanceObserver |
| OCR active jobs | 1–3 by device class | Scheduler test + runtime trace |
| Reader DOM | Virtualize or chunk when paragraph count is large | React Profiler/DOM count |
| Initial JavaScript | Set after bundle baseline; enforce trend, not guesswork | Vite manifest/analyzer |
| Mobile layout | No horizontal overflow at 320px | Browser E2E |
| Memory | Bounded growth during a long-book session | Chrome performance recording |

### Steps

1. Add `performance.mark()` / `performance.measure()` around import selected, manifest ready, first unit ready, OCR started, OCR completed, reader mounted, and resume ready.
2. Add a production-only local diagnostic panel guarded behind a query flag or developer setting.
3. Analyze the Vite production output; lazy-load OCR UI, Three.js, optional assistant panels, and below-the-fold landing visuals.
4. Virtualize or window long paragraph lists; keep only visible and nearby reader content mounted.
5. Memoize only measured expensive subtrees; do not blanket-wrap components.
6. Track render counts for reader viewport and controls.
7. Add bundle-size and test-fixture timing reports to CI artifacts.

## Critical gap 7: OCR quality and failure model need product-grade rigor

### Why it matters

OCR is not just a model call. It includes native-text detection, rasterization, rotation, preprocessing, detection, recognition, reading order, paragraph reconstruction, confidence handling, cache, cancellation, and review. The repository already supports native/accelerated OCR concepts and documents a useful API; the missing premium layer is explicit quality confidence, source provenance, benchmark corpus, and non-destructive fallback. [file:2]

### Steps

1. Define native-text quality scoring: extracted character count, printable-character ratio, word ratio, and expected-page-content checks.
2. OCR only pages that lack usable native text by default.
3. Keep page image and bounding boxes when OCR is used.
4. Calculate line/page confidence and expose low-confidence status.
5. Add a column-aware reading-order resolver; test two-column papers separately from prose books.
6. Add preprocessing variants only on retry, not for every clean page.
7. Ensure text cleanup does not destroy equations, code, citations, lists, or hyphenated words without user review.
8. Create a labeled, legally usable OCR fixture corpus and report CER/WER, reading-order accuracy, paragraph-boundary agreement, and latency.
9. Never claim “accurate OCR” globally; publish scope and measured results.

### Test gates

- Native text avoids OCR on a normal text PDF.
- Scan triggers OCR and reaches a readable first unit.
- A two-column fixture retains correct reading order.
- OCR failure preserves original-page mode.
- Repeated headers/footers are removed only under a confidence threshold and remain recoverable.

## Critical gap 8: Observability and bug triage are not yet a system

### Why it matters

Without structured diagnostics, “PDF import failed” is impossible to improve systematically. A premium codebase captures the job stage, file-safe metadata, device/browser environment, error type, elapsed time, retries, and cache state—without uploading book contents by default.

### Local diagnostic event model

```ts
interface DiagnosticEvent {
  id: string;
  at: number;
  documentId: string;
  event: 'IMPORT_STARTED' | 'MANIFEST_READY' | 'UNIT_READY' | 'OCR_FAILED' | 'JOB_CANCELLED' | 'CACHE_QUOTA';
  unitId?: string;
  elapsedMs?: number;
  errorCode?: string;
  environment: { browser: string; deviceMemory?: number; hardwareConcurrency?: number };
}
```

### Steps

1. Add typed error codes across frontend and backend, for example `PDF_PASSWORD`, `PDF_CORRUPT`, `OCR_WORKER_INIT`, `OCR_TIMEOUT`, `CACHE_QUOTA`, `NETWORK_ABORTED`.
2. Record a local diagnostic timeline per import without raw document text.
3. Add a `Copy diagnostic report` and `Clear diagnostics` user option.
4. Use an error boundary around reader, importer, and optional 3D modules independently.
5. Convert each recurring production issue into: reproduction fixture, regression test, root-cause note, and fix PR.
6. Add backend request IDs and include them in SSE/OCR events.

## Critical gap 9: Security hardening for untrusted documents

### Why it matters

Book files, EPUB ZIP archives, file names, metadata, embedded markup, and backend upload payloads are untrusted input. The existing project guidance recognizes this, and that must become concrete validation and tests. [file:1]

### Steps

- Enforce size/type checks both client-side and server-side.
- Validate actual file signatures where feasible, not only extensions.
- Limit EPUB archive entries, decompressed total size, nesting depth, and path traversal.
- Treat extracted EPUB HTML as text/content data; never insert it as unsanitized HTML.
- Keep React element rendering and avoid `dangerouslySetInnerHTML` for book text.
- Use server-side timeouts, request size limits, and concurrency caps for OCR.
- Add dependency vulnerability scanning and pinned lockfile review.
- Test malicious filenames, oversized files, archive bombs, malformed PDFs, SVG/script-like payloads, and hostile metadata.

## Critical gap 10: Product focus and information density

### Why it matters

Bookflow has a feature-rich reader surface: focus modes, salience/Bionic formatting, guides, panels, visual effects, reward/intervention components, OCR, and 3D-related work. The product risk is not too few ideas but too much simultaneous cognitive load. The project’s own reading rules explicitly say to avoid noisy animations, badges, popups, or gamification that competes with reading. [file:1]

### Decision rule

Every reader feature must answer one of these questions:

- Does it help the user start reading?
- Does it help the user keep their place?
- Does it help the user understand or remember?
- Does it help the user return?
- Does it preserve accessibility or privacy?

If the answer is no, isolate it as optional polish or remove it.

### Steps

1. Create a “calm default” with only resume, chapter, progress, reader text, bookmark/note, and settings visible.
2. Put advanced features behind a deliberate panel, not floating controls over text.
3. Make Bionic/salience formatting opt-in and test whether users prefer it; do not claim it improves reading speed without study.
4. Keep Three.js out of the core reading content path; pause it when reader mode is active.
5. Use one deterministic progress system, not variable rewards.
6. Gated optional polish (opt-in, default off): chapter-complete capsules, flow sparklines, retention modals. Must use neutral copy, respect reduced-motion, never block reading.
7. Conduct five moderated usability sessions before adding more gamification.

## Two-month execution roadmap

Assume one developer or a small student team working 10–20 focused hours weekly. Do not start a new major feature while the weekly quality gate is failing.

### Week 1: Baseline and safety net

**Goal:** Know what is slow, fragile, and untested before changing architecture.

- Run `npm run lint`, `npm test`, `npm run build`, and `pytest backend/tests/` as baseline checks.
- Catalog current feature flows, state ownership, module dependency graph, and direct storage calls.
- Add legal test fixtures: short native PDF, long native PDF, scanned PDF, corrupt PDF, two-column PDF, EPUB, TXT, Markdown, and Indonesian/English OCR samples.
- Add performance marks for import and first readable content.
- Add a baseline benchmark report: load time, first readable unit, memory trace, initial bundle size, and test counts.
- Add issue templates: bug report, performance regression, accessibility regression, import/OCR failure.

**Definition of done:** Baseline reports are committed; all current tests pass; every current known bug has reproduction steps or is explicitly marked unreproducible.

### Week 2: Characterization and refactor preparation

**Goal:** Protect behavior before moving code.

- Write tests for import, reader resume, notes, bookmarks, settings, keyboard navigation, and mobile layout.
- Add an app-level error boundary around reader, importer, and 3D/optional modules.
- Extract pure utility logic from `App.jsx` with no behavior change.
- Add narrow Zustand selectors/hooks to avoid broad state subscriptions.
- Establish naming and module-boundary rules in the existing agent guide.

**Definition of done:** New characterization tests pass before/after extraction; no user-facing behavior change; React Profiler baseline captured.

### Week 3: Reader domain decomposition

**Goal:** Remove root-component bottlenecks.

- Move reader composition into `ReaderShell`, `ReaderViewport`, and `ReaderChrome`.
- Create `useReaderSession`, `useReaderNavigation`, and `useReaderPersistence`.
- Extract annotations into a feature store/module.
- Replace cross-feature internal imports with public feature exports.
- Add tests for state transitions and render scope.

**Definition of done:** `App.jsx` becomes a thin feature composer; notes/settings/reader actions remain fully functional; no broad root re-render during ordinary scroll.

### Week 4: Manifest-first import and scheduler foundation

**Goal:** First readable content arrives before whole-book processing.

- Implement `DocumentManifest` and `ImportCoordinator`.
- Add per-unit statuses and job IDs.
- Implement queue priorities and concurrency caps.
- Add cancellation when users jump or close the document.
- Make UI show per-unit readiness and actionable failure status.
- Persist manifest and completed units through a temporary IndexedDB adapter.

**Definition of done:** A simulated 200-unit document renders the first unit before background processing completes; max concurrency tests pass; stale jobs stop safely.

### Week 5: OCR quality and robust cache

**Goal:** Make scanned PDFs survivable and inspectable.

- Add native-text quality detection.
- Move Tesseract work into workers; lazy-load relevant language assets.
- Add OCR result provenance: page, confidence, model, elapsed time, boxes when available.
- Wire optional PaddleOCR acceleration behind an explicit opt-in.
- Add retry policies and original-page fallback.
- Build quota-aware IndexedDB/OPFS adapter with LRU cache strategy.

**Definition of done:** Native PDF avoids unnecessary OCR; scan processes progressively; failed page never blocks reader; cache survives refresh and handles quota errors.

### Week 6: Anchor durability and premium reader flow

**Goal:** Make reading state trustworthy.

- Implement quote-plus-location anchors.
- Add anchor migration/repair for parser/OCR changes.
- Add paginated/chunk mode with stable chapter and unit landmarks.
- Add look-back behavior that preserves current anchor.
- Improve resume logic to use meaningful paragraph position.
- Add export/import for annotations and reading state.

**Definition of done:** Notes survive supported parser changes; resume returns to the correct location; long reading content is windowed/virtualized.

### Week 7: E2E, accessibility, and performance gates

**Goal:** Turn quality into an automated release rule.

- Add Playwright E2E import/reader/OCR cancellation flows.
- Add axe accessibility scans and keyboard assertions.
- Add visual snapshots for mobile and themes.
- Add bundle report and budget enforcement.
- Add browser performance test runs for native and scanned fixtures.
- Test backend unavailable, corrupt file, quota full, and aborted upload paths.

**Definition of done:** PR CI runs lint, unit, backend, E2E smoke, accessibility smoke, build, and security checks; known failures have a triage label/owner.

### Week 8: Stabilization, UX audit, and beta release

**Goal:** Ship a credible beta with evidence.

- Fix all P0 bugs found by testing.
- Conduct five usability sessions focused on import, first read, note, resume, and error recovery.
- Remove or defer distracting features that fail the calm-reader criterion.
- Tune Three.js so it never blocks core reading; verify reduced-motion/no-WebGL fallback.
- Publish a changelog, privacy behavior, supported-format limits, known issues, and benchmark summary.
- Tag a beta release only after all release gates pass.

**Definition of done:** Beta has measured baseline-vs-after results; known limitations are transparent; all P0 acceptance tests pass.

## Daily debugging loop

Use this loop for every issue. It prevents random edits and AI-agent thrashing.

1. **Reproduce:** Capture exact file fixture, browser, device, route, actions, expected result, actual result, and console/network output.
2. **Classify:** UI, state, parser, PDF.js, OCR worker, backend, persistence, accessibility, performance, or security.
3. **Instrument:** Add a temporary or permanent structured log/metric around the failing boundary; never log raw book content or secrets.
4. **Isolate:** Reduce to the smallest failing page, paragraph, function, or request.
5. **Test first:** Add a failing unit/integration/E2E test when feasible.
6. **Fix narrowly:** Change the smallest responsible module; avoid unrelated refactors in bug PRs.
7. **Verify:** Run targeted test, full relevant suite, production build, and manual check in at least one desktop and one mobile viewport.
8. **Measure:** Compare timing/memory/error rate if performance-related.
9. **Document:** Write root cause, prevention, fixture location, and follow-up issue if needed.

## AI-agent task template

Give coding agents small, testable tasks. Do not ask an agent to “make the whole reader premium.”

```md
# Task: [short outcome]

## Context
- Repository: loucasty-cell/bookflow
- Relevant files: [exact paths]
- Invariants: local-first privacy; no raw book text in remote services without consent; no dangerouslySetInnerHTML; preserve mobile accessibility.

## Problem
[Observed behavior, fixture, reproduction steps]

## Desired behavior
[Precise acceptance behavior]

## Non-goals
[What must not be changed]

## Implementation constraints
- Use existing dependencies unless explicitly authorized.
- Keep feature boundaries.
- Add cancellation and error handling where asynchronous work is changed.
- Do not alter persisted schemas without migration.

## Tests required
- Unit: [...]
- Integration: [...]
- E2E/manual: [...]

## Commands
npm run lint
npm test
npm run build
pytest backend/tests/

## Acceptance criteria
- [Measurable criterion]
- [Measurable criterion]
- [No regression criterion]
```

## Bug severity policy

| Severity | Meaning | Expected action |
| --- | --- | --- |
| P0 | Data loss, security issue, app cannot read/open supported file, persistent crash | Stop release work; reproduce and fix immediately |
| P1 | Major feature broken, long-book lockup, notes unreliable, serious accessibility blocker | Fix in current sprint |
| P2 | Degraded UI, non-blocking performance issue, limited-device issue with workaround | Plan next sprint |
| P3 | Cosmetic/polish issue | Batch and prioritize later |

## Release checklist

### Functional

- Supported PDF, EPUB, TXT, and Markdown fixtures import correctly.
- Native PDF text is preferred over OCR.
- Scanned PDF can be read progressively.
- Cancel, retry, and original-page fallback work.
- Search, notes, bookmarks, settings, and resume work after reload.
- Export/import state works and schema migration is tested.

### Performance

- First readable content meets documented benchmark target.
- Long books do not require full document processing before reading.
- Queue concurrency remains capped.
- No long main-thread freezes in ordinary navigation.
- Initial bundle does not regress beyond CI budget.

### Accessibility

- Keyboard and touch navigation work.
- Modal focus handling is correct.
- Labels and status updates are exposed appropriately.
- Reduced-motion behavior is respected.
- 320px layout has no horizontal overflow.

### Privacy and security

- Book contents remain local by default.
- Remote/accelerated OCR requires explicit choice.
- No secrets or documents are logged.
- Untrusted archive/document validation tests pass.
- Dependency and secret scans pass.

## What not to do

- Do not rewrite the app into another framework during these two months.
- Do not add cloud AI, semantic databases, or account systems before document reliability is solved.
- Do not render reading text inside Three.js/WebGL.
- Do not promise 50% faster, more comprehension, less eye strain, or “addictive reading” without a defined metric and study.
- Do not process every page at once.
- Do not sacrifice original PDF mode for text extraction; tables, equations, and figures need a layout-preserving fallback.
- Do not convert a fix into a large redesign without tests and a rollback plan.

## Success metrics to publish after Week 8

Report baseline and post-work values instead of subjective claims:

- Supported-fixture import success rate.
- Median/p95 time to first readable unit.
- Median/p95 scanned-page OCR time.
- Maximum observed active OCR jobs.
- Long-book peak-memory trend.
- E2E pass rate and flaky-test count.
- Accessibility violations in key flows.
- Annotation persistence success rate.
- User task completion rate from five usability sessions.
- Number of P0/P1 defects discovered before versus after release candidate testing.

## Final prioritization

If time is limited, spend the two months in this order:

1. Progressive import/OCR scheduler and cancellation.
2. Durable storage plus reliable anchors.
3. E2E/accessibility/performance quality gates.
4. Root component/state decomposition.
5. OCR confidence and benchmark corpus.
6. Calm reader UX polish and optional Three.js improvements.

This ordering is intentionally unglamorous. It is what turns Bookflow from a feature-rich prototype into a reader users can trust with a real textbook, paper, or scanned book.

## Source notes

- Bookflow’s local-first rules, implementation stack, feature boundaries, reader rules, document-processing rules, and required verification commands were taken from the repository’s `AGENTS.md`. [file:1]
- Existing normalized book contract, browser persistence shape, and FastAPI OCR/API behavior were taken from `api.md`. [file:2]
- Existing structural classification and its caution against unvalidated accuracy claims were taken from `book-structure-algorithm.md`. [file:3]
- Browser PDF performance recommendations around cancellation and worker/offscreen rendering are supported by PDF.js-oriented performance guidance. [web:50]
- The testing/quality comparison reflects Calibre-Web development and testing documentation. [web:44]
- React performance recommendations favor measurement, code splitting, and virtualization for long lists rather than indiscriminate optimization. [web:52][web:56]
- Persistent local file/storage capability must be feature-detected and have fallback behavior, per the File System API documentation. [web:19]
