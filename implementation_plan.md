# Implementation Plan

Goal: bring brainobs fully up to date with every Bookflow frontend and backend sector and function, research leading reading apps from primary sources, and produce a scored UI and experience upgrade backlog. Plan only for product code; vault notes are the deliverable in this pass.

Scope: React 19 + Vite 8 frontend, Zustand stores, document import, reader engine, landing, shared UI, FastAPI backend, OCR pipeline, SSE streaming, tests, tooling, and the brainobs vault. Review window is the recent main commits: calm reader defaults with opt-in polish and progressive import, import performance marks and vault check tooling, fixture corpus, product plans plus knowledge vault, Archify diagrams, and vitest discovery scoping.

Approach: three passes. Pass 1 reconciled code truth against vault claims file by file and corrected four wrong claims. Pass 2 researched competitors from primary sources and scored every mechanic. Pass 3 produced a prioritized 24 item upgrade backlog with exact file paths and acceptance checks.

## Types

No production type migration. Frontend stays JavaScript with JSDoc style contracts; backend stays Pydantic v2.

- brainobs frontmatter stays: title, type, status, updated, tags, source-files.
- Status vocabulary stays fixed: verified, partial, planned, exploratory, living.
- NormalizedBook contract unchanged: title, author, kind, chapters with title, paragraphs, optional subheadings, focus eligibility.
- Backend wire aliases unchanged: snake_case Python to camelCase JSON with populate_by_name.
- New research notes use type research or spec, status planned or verified per evidence.

## Files

New brainobs notes delivered in this pass:

- brainobs/09-Competitor Research/Competitor Research MOC.md
- brainobs/09-Competitor Research/Kindle Research.md
- brainobs/09-Competitor Research/Apple Books Research.md
- brainobs/09-Competitor Research/Everand Scribd Research.md
- brainobs/09-Competitor Research/Libby Research.md
- brainobs/09-Competitor Research/Goodreads Research.md
- brainobs/09-Competitor Research/Bookly and Fable Research.md
- brainobs/03-Psychology/Competitor Mechanics Scorecard.md
- brainobs/05-Roadmap/Audit Compare Replan.md
- brainobs/05-Roadmap/Massive Upgrade Backlog.md
- implementation_plan.md

Updated brainobs notes:

- brainobs/00-Dashboard.md: added the Competitor Research MOC entry.
- brainobs/03-Psychology/Psychology MOC.md: added the scorecard.
- brainobs/03-Psychology/Atomic Habits Framework.md: HorizonTeaser marked built with real detail.
- brainobs/02-Features/Document Import/Paragraph Classification.md: corrected partial to verified with real function names.
- brainobs/04-UX Playbook/Premium Micro-interactions.md: haptics corrected to verified and wired with the real pattern table.
- brainobs/05-Roadmap/Current State Matrix.md: haptics and paragraph classification corrected to verified.
- brainobs/05-Roadmap/Roadmap MOC.md: audit and backlog wired in.
- brainobs/06-API Reference/Frontend Public APIs.md: shared lib exports corrected to include haptics and text helpers.

Files to delete: none. Flagged for decision: src/features/reader/components/resonance.css is orphaned with no importer.

Configuration: no changes. package.json already exposes check:vault from the previous pass.

Planned new files for the backlog phase, not implemented here:

- src/features/library/lib/libraryStore.js
- src/features/library/lib/readingSpeed.js
- src/features/library/lib/readingStats.js
- src/features/library/lib/readingGoals.js
- src/features/library/lib/durableStorage.js
- src/features/library/index.js
- src/features/landing/components/ResumeCard.jsx
- src/features/landing/components/RecentShelf.jsx
- src/features/reader/components/SessionRecap.jsx
- src/features/reader/components/LookBackPanel.jsx
- src/features/reader/lib/dictionary.js
- src/features/reader/lib/readingMoods.js
- public/manifest.webmanifest plus a service worker

Planned modifications for the backlog phase:

- src/features/reader/components/ReaderPage.jsx: progress area, time left in chapter
- src/features/reader/components/HorizonTeaser.jsx: real estimate from word count
- src/features/reader/components/NotesPanel.jsx: search and jump to quote
- src/features/reader/components/SelectionTooltip.jsx: local look up action
- src/features/reader/config.js: new defaults, all off
- src/shared/lib/haptics.js: reduced motion gate
- src/features/document-import/lib/pdfParser.js: multi-column spatial sorting

## Functions

New functions planned for the backlog phase, not implemented here:

- Library: libraryStore read and write, addEntry, updateEntry, evictOldest
- Library: readingSpeed estimate, readingStats derive, readingGoals read and write
- Reader: dictionary lookup, LookBackPanel data shaping
- Haptics: reduced motion gate inside triggerHaptic

Functions corrected in the vault during this audit:

- classifyParagraph in src/shared/lib/text.js: documented as implemented with real category signals
- formatClassification in src/shared/lib/text.js: documented
- triggerHaptic and HAPTIC_PATTERNS in src/shared/lib/haptics.js: documented as wired into FocusCard and SelectionTooltip
- HorizonTeaser: documented with real props and trigger condition
- estimateReadingMs in readingController.js: documented as fixed 220 WPM, which is the Phase 2 gap

Removed functions: none.

## Classes

New classes: none planned. The frontend uses functions and Zustand stores; the backend uses Pydantic models already present.

Reverified backend models: OCRJob, PageData, Settings, OCRPageResult, OCRDocumentResponse, NormalizedBook, Chapter, Note, Bookmark, ReadingProgress, ExportPayload.

Removed classes: none.

## Dependencies

No new dependency added. One is anticipated and explicitly deferred:

- Item 9 local dictionary requires approval for a dictionary data source.
- Item 18 durable storage anticipates OPFS or IndexedDB, both native browser APIs, no package.
- Everything else uses existing pdfjs-dist, jszip, tesseract.js, zustand, framer-motion, swr, lucide-react, three, and the current FastAPI stack.

## Testing

Verified in this pass:

- node scripts/check-vault.mjs must PASS with zero missing frontmatter, zero bad source paths, zero broken links, zero orphans.

Required after any implementation phase:

- npm run lint, npm test, npm run build, and pytest backend/tests/ where backend notes change.
- Every Current State Matrix change needs file, constant, command, or observed behavior evidence.
- New tests beside the code: libraryStore.test.js, readingSpeed.test.js, readingStats.test.js, readingGoals.test.js.

## Implementation Order

1. Done: reconcile frontend truth and correct the four wrong vault claims.
2. Done: reconcile import truth including fileValidation, parsers, manifest, scheduler, coordinator.
3. Done: reconcile backend truth including main.py OCR engine, routers, models, config, tests.
4. Done: refresh contracts and references, public exports, environment config.
5. Done: refresh agent context and the Current State Matrix.
6. Done: research six competitor sources from primary evidence and write one note per app.
7. Done: score every mechanic in the Competitor Mechanics Scorecard.
8. Done: publish Audit Compare Replan and Massive Upgrade Backlog as plan only.
9. Done: run the vault checker to a PASS.
10. Next: user decides the Phase 4 blocking questions, then implementation begins with backlog item 1.