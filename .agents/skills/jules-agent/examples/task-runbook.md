# Jules Task Runbook: Example Workflow

This runbook demonstrates how Jules tackles a real-world coding task from problem statement to verified delivery.

---

## Scenario: Bug Fix & Type Safety Hardening

### 1. Task Diagnostics
- **User Prompt**: "Fix 35 Python errors and ensure frontend OCR modal works cleanly."
- **Stack Discovery**:
  - React + Vite frontend (`package.json`)
  - FastAPI backend (`backend/requirements.txt`, `backend/main.py`)
  - Python 3.12 virtual environment at `backend/.venv`
  - ESLint, Vitest, Pyright, Pytest configured

### 2. Investigation
- Ran Pyright: Discovered 35 type errors caused by Pydantic model alias mismatches and loose PyMuPDF typing.
- Traced `OCRPageResult`, `NormalizedBook`, and `ReadingProgress` models across backend services and routers.
- Checked `eslint.config.js` and found `.venv` was mistakenly scanned.

### 3. Surgical Execution
- Updated Pydantic models to use `serialization_alias` and `validation_alias`.
- Updated all router and service constructor calls to snake_case kwargs.
- Added type guards (`isinstance(b, (tuple, list))` and `str(raw_text)`) in `document_service.py` and `ocr_service.py`.
- Added `**/.venv/**` to `eslint.config.js` ignore list.

### 4. Verification
- Pyright: `0 errors, 0 warnings, 0 informations`
- Pytest: `16 passed in 1.37s`
- ESLint: `0 errors`
- Vitest: `33 passed in 7.07s`
- Vite Build: `Clean production build`

### 5. Delivery Report
Provided structured summary with clickable file links and exact test outputs.
