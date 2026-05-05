# Bookflow

Bookflow is a lightweight app for managing and exploring books, notes, and reading flow. It helps authors, readers, and learners collect ideas, track reading progress, and connect notes across books for better discovery and creative workflows.

Key features (examples)
- Add and organize books, chapters, and notes.
- Link notes across books to build a knowledge graph.
- Track reading progress and session history.
- Export notes and reading lists.
- Plugin-friendly: add importers (Kindle, EPUB), exporters, or integrations (Notion, Obsidian).

Makefile quick usage
Bookflow repository includes a Makefile with convenient cross-language targets. The Makefile auto-detects common project files (package.json, pyproject.toml, requirements.txt, go.mod, Cargo.toml) and chooses sensible commands.

Common commands:
- make install    # install dependencies
- make dev        # run in development mode (hot-reload if available)
- make run        # run the app (production or default run command)
- make build      # build artifacts (if applicable)
- make test       # run tests
- make lint       # run linter if configured
- make format     # format code if configured
- make clean      # remove build artifacts and environments

Examples
- Install dependencies and start development server:

  make install
  make dev

- Build and run (if project has a build step):

  make build
  make run

How the Makefile decides what to run
- If package.json exists, Makefile uses npm scripts (npm install, npm run dev, npm start, npm test, npm run build).
- If pyproject.toml or requirements.txt exists, Makefile creates/uses a .venv and runs Python commands (python -m <module> or python main.py). If Poetry is available it prefers poetry install.
- If go.mod exists, runs `go run`/`go build`/`go test`.
- If Cargo.toml exists, uses cargo commands.
- If none are present, the Makefile prints a helpful message — edit it to match your run/build commands.

Adding custom commands
If your Bookflow app uses a custom start command, update the Makefile `run` and `dev` targets to call your preferred commands (for example: `uvicorn bookflow.main:app --reload` for a FastAPI app, or `next dev` for a Next.js app).

Cool ideas and feature suggestions
- Reading cards: short summary cards for each chapter with highlights and tags.
- Daily reading goals with streaks and session timers.
- Automatic highlight import from Kindle/EPUB and smart-summarization of passages.
- Graph view of notes and concepts to discover connections between books.
- Public reading lists and collaborative annotations.
- Plugin system: allow community extensions for importers, exporters and AI summarizers.

If you want, I can also:
- Detect the primary language of this repository and tailor the Makefile to specific commands.
- Add example start scripts for Node/Python/Go/Rust projects.

---

Made with ❤️ for Bookflow by loucasty-cell. 
