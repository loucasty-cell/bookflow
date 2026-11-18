# Google AI Studio Rules & Environment Gate

## Working Boundary
- Environment: Google AI Studio / Web Sandbox.
- Focus: **Frontend First** (`src/`). Ensure React 19 reader, navigation, focus rail, and UI polish operate cleanly.
- Backend: Optional FastAPI service. In this environment, use the built-in Vite development mock gate (`VITE_AI_STUDIO_MODE=true` or automatic fallback on connection refused).
- Dummy Data: Use simulated dummy responses for `/api/reading-lens`, `/api/ocr/*`, and `/api/social/*`.
- Privacy Invariant: Book text is strictly local-first. Never transmit document text outside without explicit user consent.
- Verification: Always run `npm test` and `npm run typecheck` before finishing tasks.
