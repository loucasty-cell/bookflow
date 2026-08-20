# Jules Adaptability Protocol

Guidelines for discovering, diagnosing, and conforming to any project environment and tech stack dynamically.

---

## 1. Discovery Checklist

When entering a new project or task, execute the following discovery sequence:

### 1.1 Project Rules & Documentation
1. Look for rule manifests:
   - `AGENTS.md` (Antigravity and custom agent rules)
   - `CLAUDE.md`, `.cursorrules`, `.windsurfrules`
   - `CONTRIBUTING.md`, `DEVELOPMENT.md`, `README.md`
2. Read the rule files and extract:
   - Commit formatting rules (e.g., conventional commits, prefix types).
   - Dependency addition policies (e.g., explicit approval required).
   - Formatting and comment guidelines (e.g., omit unrequested comments, no emojis).
   - Architectural constraints (e.g., privacy boundaries, local-first processing).

### 1.2 Tech Stack & Tooling Detection

| Artifact Found | Inferred Ecosystem | Common Commands |
| :--- | :--- | :--- |
| `package.json` | Node.js / TypeScript / Frontend | `npm test`, `npm run lint`, `npm run build` |
| `pyproject.toml` or `requirements.txt` | Python | `pytest`, `ruff check`, `pyright` |
| `Cargo.toml` | Rust | `cargo test`, `cargo clippy`, `cargo build` |
| `go.mod` | Go | `go test ./...`, `golangci-lint run` |
| `composer.json` | PHP | `composer test`, `vendor/bin/phpunit` |
| `build.gradle` or `pom.xml` | JVM (Java/Kotlin/Scala) | `./gradlew test`, `mvn test` |

### 1.3 Virtual Environments & PATH Detection
- For Python projects:
  - Check if a virtual environment exists (`.venv/`, `venv/`, `env/`).
  - Use the virtual environment Python interpreter directly:
    - Windows: `.venv\Scripts\python.exe` or `backend\.venv\Scripts\python.exe`
    - POSIX: `.venv/bin/python` or `backend/.venv/bin/python`
  - Check `pyrightconfig.json` or `.vscode/settings.json` for configured interpreter paths.
- For Node.js projects:
  - Use local binaries via `npx` or scripts defined in `package.json`.

---

## 2. Dynamic Rule Compliance

Jules strictly adheres to the following behavioral invariants across all ecosystems:

1. **Follow Existing Idioms**:
   - Match existing variable naming (camelCase, snake_case, PascalCase).
   - Match quote styles (single vs double quotes), semicolon usage, and indentation (tabs vs spaces, 2 vs 4).
   - Follow neighboring file patterns for imports, exports, and function structures.

2. **No Extraneous Code**:
   - Do not add debug `console.log` or `print` statements in final output.
   - Do not add explanatory comments in production code unless the user explicitly asks for them.
   - Do not add unnecessary wrapper functions or over-engineered abstractions.

3. **Dependency Discipline**:
   - Never run `npm install <new-package>`, `pip install <new-package>`, or `cargo add` without user approval.
   - Leverage existing standard libraries and already installed packages first.
