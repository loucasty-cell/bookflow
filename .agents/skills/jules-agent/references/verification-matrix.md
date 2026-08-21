# Jules Verification Matrix & Diagnostics

Diagnostic workflows for validating code correctness, resolving lint errors, type failures, and test regressions across various stacks.

---

## 1. Verification Hierarchy

Verification must always be executed in a 4-tier funnel:

```text
Tier 1: Syntax & Linting       -->  Catch syntax errors and code style violations
Tier 2: Static Type Analysis   -->  Catch type mismatches, missing properties, null pointer risks
Tier 3: Unit & Service Tests   -->  Verify functional correctness and boundary edge cases
Tier 4: Production Build       -->  Verify bundling, tree-shaking, packaging, and imports
```

---

## 2. Common Stack Verification Commands

### 2.1 Node.js / TypeScript / React / Next.js / Vite
- **Lint**: `npx eslint .` or `npm run lint`
- **Type Check**: `npx tsc --noEmit`
- **Tests**: `npx vitest run` or `npm run test`
- **Build**: `npm run build`

### 2.2 Python (FastAPI / Pytest / Pyright)
- **Lint**: `ruff check .` or `flake8`
- **Type Check**:
  - Direct: `backend\.venv\Scripts\python.exe -m pyright backend/`
  - Workspace: `npx pyright` (configured via `pyrightconfig.json`)
- **Tests**:
  - Run from backend folder: `pytest -v` (with venv active)
  - Explicit venv: `backend\.venv\Scripts\python.exe -m pytest backend/tests/ -v`
- **Clean Diff Check**: `git diff --check`

### 2.3 Rust
- **Format**: `cargo fmt --check`
- **Lint**: `cargo clippy -- -D warnings`
- **Type / Compile**: `cargo check`
- **Tests**: `cargo test`
- **Build**: `cargo build --release`

---

## 3. Systematic Debugging & Error Recovery

When a verification step fails, apply the Jules 4-step recovery process:

1. **Isolate**: Extract the exact error message, file location, and line number.
2. **Trace**: Check the caller, function contract, or schema definition to determine why the error occurred.
3. **Hypothesize**: Formulate the root-cause hypothesis before touching code (e.g., camelCase vs snake_case mismatch, missing null guard, unhandled promise).
4. **Surgically Fix & Re-verify**: Apply the minimal correction and re-run the failed check immediately. Do not guess with multiple unrelated edits.
