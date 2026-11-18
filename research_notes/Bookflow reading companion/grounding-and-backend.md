# Grounding and backend reliability

## Which text is authorized, and does it stay attached to the answer?

### Takeaway

Keep one explicitly attached, bounded passage per request. Snapshot its provenance, question and action at submission, then use that snapshot for the request, response, retry and note.

### Cited Findings

- Reader overlays mount one shared Lens state instance, but wire the Lens bar's current-paragraph picker to `selection.text` instead of `focusedParagraph.text`. With no selection the advertised paragraph picker gets an empty string. [ReaderOverlays.jsx:43–59,144–148](../../src/features/reader/components/ReaderOverlays.jsx)
- The shared hook accepts an explicit `options.passage` and then judges it stale as soon as live selection differs. This invalidates legitimately attached context if it came from the focused paragraph or remembered selection, or if clicking away collapses the DOM selection. The adapter does use an explicit passage. [useReadingLens.js:551–556,643–645,679–688](../../src/features/reader/hooks/useReadingLens.js), [useLensRequest.js:45–52](../../src/features/lens-bar/hooks/useLensRequest.js)
- The floating focus card falls back through focused text, chapter body, chapter name and hard-coded Bookflow prose on the global surface. Custom questions, mode buttons and suggested questions can all submit that fallback. [FocusCard.jsx:130–141,435–455,872–879](../../src/features/reader/components/FocusCard.jsx)
- The bar saves using the currently attached text or remembered selection, then regenerates using the current form. Both can differ from the source of the completed answer. The hook's retry does not capture translation language or the composed chapter context. [LensBar.jsx:195–217](../../src/features/lens-bar/components/LensBar.jsx), [useReadingLens.js:794–803](../../src/features/reader/hooks/useReadingLens.js)
- `composeLensPassage` clips the selected passage at 4,000 characters and can append 12,000 chapter characters behind a toggle. The bar's trimming indicator uses a 6,000-character heuristic and can miss text that was actually cut. [useReadingLens.js:10–15,61–81,605–615](../../src/features/reader/hooks/useReadingLens.js), [useLensRequest.js:75–97](../../src/features/lens-bar/hooks/useLensRequest.js)
- `ReadingLensRequest` gives `passage` a default of `None`; omission is explicitly a passing test, despite the route's bounded-passage intent. It rejects explicit null but currently permits an omitted or whitespace-only passage. [reader.py:54–69,330–352](../../backend/app/routers/reader.py), [test_reading_lens.py:389–396](../../backend/tests/test_reading_lens.py), [AGENTS.md:190–191](../../AGENTS.md)
- On-device mode returns word/sentence/character counts and the opening line for every action. A successful remote message never sets `isLocal: false`, although the floating bar requires that exact flag to label a response as cloud. [useReadingLens.js:329–348,627–640,755–763](../../src/features/reader/hooks/useReadingLens.js), [useLensRequest.js:104–116](../../src/features/lens-bar/hooks/useLensRequest.js)

### Inferences

- With no attached excerpt, offer **Use current paragraph** only when actual paragraph text exists. A selection made through the reader tooltip should capture the real paragraph/chapter before focus moves. Keep the submitted excerpt fixed while someone reads elsewhere. Reopening in a different book should clear attached text and session consent.
- Show the exact outbound input, length and trimming before sending. Use **Send this excerpt once** and **Allow for this reading session** and a visible **Stay on device** path. Keep larger context separately opt-in. If a larger context toggle is unnecessary for this redesign, remove it from the default flow instead of silently enabling it.
- Use local snapshot metadata for the label **From Page 12** or **From Chapter 3**, only when known. This label means where the request text came from. Show provenance separately from the model answer and never imply that the model verified citations. `Page 12` is only present when Bookflow has that label, with no page label invented for EPUB or text.
- Reliable local tools include revealing or copying the exact passage, and a clearly named extractive excerpt or deterministic keyword lookup if already available. Put question answering, interpretation and translation behind cloud consent. Communicate this difference instead of presenting word counts as an offline answer.
- A scanned PDF without extracted text should offer guidance on reading text or OCR. The Lens should work with reviewed OCR passages, not attach images or an entire PDF. App-level OCR totals are insufficient for a per-page warning. [importCoordinator.js:153–156,310–343](../../src/features/document-import/lib/importCoordinator.js), [manifestToBook.js:1–15](../../src/features/document-import/lib/manifestToBook.js)

### Gaps

- No live-provider request or private-document upload was made. Per-page rendered citation jump behavior and OCR correction affordances would need their own browser checks if implemented.

## What should count as sent, stopped, interrupted or complete?

### Takeaway

Fix cancellation and consent races before making the assistant more prominent. Publish a finished answer only after a valid terminal event and never send an automatic replacement request after user-visible partial output.

### Cited Findings

- Bar consent can queue multiple unresolved submit callbacks, wakes all of them on one decision and revokes send-once only after the requests complete. A real send-once grant needs to apply to one accepted submission. [useLensConsent.js:19–54](../../src/features/lens-bar/hooks/useLensConsent.js), [LensBar.jsx:268–284](../../src/features/lens-bar/components/LensBar.jsx)
- The hook replaces the active abort controller without aborting the previous one directly. Certain stale paths still set a shared status and provider/candidate/attempt handlers check mount without verifying generation. Pending errors across superseded requests can overwrite the newer state. [useReadingLens.js:518–546,600–622,679–755,765–787](../../src/features/reader/hooks/useReadingLens.js)
- The bar maps errors with no latest message back to idle, losing rate-limit and no-context information. It shows only a generic error if an assistant message exists and drops the backend's useful failure detail. A Stop callback exists in the adapter, but the floating bar currently renders only loading text. [useLensRequest.js:75–115](../../src/features/lens-bar/hooks/useLensRequest.js), [LensBar.jsx:174–183](../../src/features/lens-bar/components/LensBar.jsx)
- Backend fallback skips to a new model only before it emits answer text. A response that sheds its final event after a delta is still marked complete and defaults to `STOP`. The browser client accepts an SSE body at EOF without insisting on its documented `completed` event. [reader.py:265–307,330–336](../../backend/app/routers/reader.py), [useReadingLens.js:258–279,748–763](../../src/features/reader/hooks/useReadingLens.js)
- The Gemini API documents an empty `finishReason` while generation has not stopped. `STOP` is a natural stop point and `MAX_TOKENS` means the requested cap was hit. [Gemini GenerateContentResponse candidate](https://aistudio.google.com/api-reference/generate-content#Resource:Candidate)
- The route already keeps credentials backend-only, targets an allowlisted HTTPS provider and attaches no-store response headers. The system instruction asks the model to treat the passage as data and limit claims to the text. Keep those boundaries. [reader.py:28–49,142–184,195–205,338–373](../../backend/app/routers/reader.py)
- Baseline tests in this checkout returned `20 passed in 0.83s` for `python -m pytest backend/tests/test_reading_lens.py -q`. `npm test -- src/features/reader/hooks/useReadingLens.test.js src/features/lens-bar/hooks/useLensRequest.test.js` returned 47 tests passed across two files. [Backend test suite](../../backend/tests/test_reading_lens.py), [Reader hook test suite](../../src/features/reader/hooks/useReadingLens.test.js), [Floating adapter test suite](../../src/features/lens-bar/hooks/useLensRequest.test.js)

### Inferences

- At submission, capture passage, prompt and mode once. Allow one pending consent decision and one active network request. Abort and increment a request generation on cancel/change, and verify generation before publishing deltas, metadata, errors or final status. Keep draft and source in place when a network error occurs. Collapse to read and offer an explicit Stop while streaming.
- For the server, accept a complete natural stop, treat length-limited text as explicitly partial, and treat unconfirmed EOF as interruption. For browser SSE, preserve a separate terminal-state flag and keep fallback to existing non-SSE response parsers only if still supported. Disable Save as note on interrupted output, or offer an explicit partial state.
- Add narrow regression checks for paragraph supply with no DOM selection, explicit context that remains stable as the selection changes, new request against late old events, no remote request before consent and no duplicate request after one authorization, absent or whitespace passage, successful final event, provider cap, and interrupted EOF. Use mocked transport and synthetic passages.

### Gaps

- Upstream provider availability, platform buffering and socket-close timing were not tested on a deployed service. Added behavior must be verified on synthetic mock responses first.
