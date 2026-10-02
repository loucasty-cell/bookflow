---
title: Commit Conventions
type: reference
status: verified
updated: 2026-10-02
tags: [bookflow, process, git, commits]
source-files: [AGENTS.md, package.json, playwright.config.js, .github/workflows/webpack.yml]
---

# Commit Conventions

Required format for every commit in this repository.

## Subject prefix

Every commit subject begins with a conventional type:

| Type | Use for |
| --- | --- |
| `feat` | A user-facing feature |
| `fix` | Correcting existing behavior |
| `refactor` | Reorganizing code without changing behavior |
| `docs` | Documentation changes |
| `test` | Adding or editing tests |
| `chore` | Dependencies, build scripts, non-source maintenance |
| `style` | Visual layout and CSS |

## Body format

List included changes as `-` bullets:

```text
refactor: organize the reader by feature

- separate reader panels from application state
- move shared utilities behind public exports
```

## Hard rules

| Rule | Reason |
| --- | --- |
| No `Co-Authored-By` or other co-author trailers | Project rule |
| No emojis in commits | Project rule |
| Do not commit or push unless explicitly requested | Respects the user's control |
| Stage only intended files | Avoids unrelated changes entering history |
| Never force push | Preserves shared history |
| Never amend or rewrite a failed commit; create a new one | Keeps history honest |
| Preserve unrelated and pre-existing work | Do not silently clean up someone else's changes |

## Before committing

```bash
git status --short --branch
git diff --check
npm run lint
npm test
npm run build
```

Backend changes additionally:

```bash
pytest backend/tests/ -v
```

Release-facing or visual changes additionally:

```powershell
$env:PLAYWRIGHT_CHANNEL='chrome'; npm run test:e2e
node scripts/security/contrast.mjs
npm run check:vault
```

There is no `format` script and Prettier is not a dependency, so do not run or claim a formatter.
`npx pyright` is available but was not re-verified on 2026-10-02; if you run it, report the
fresh result rather than the last known one.

Detail: [[Verification Checklist]].

## Review the diff for

| Check | Reason |
| --- | --- |
| Unrelated files | Keep the change focused |
| Secrets or tokens | Never commit them |
| Debug output | Remove before committing |
| Generated builds | `dist/` is gitignored |
| Test books or large fixtures | Keep the repository light |
| Local editor files | Obsidian and workspace files must be intentional |
| Unsupported claims | Documentation must match reality |
| Files you did not edit | A whole-file rewrite by a shell command can rewrite files you never meant to touch |

## Editing Obsidian notes

The vault is tracked, with two rules that are easy to break:

- Never write a note with a shell write command. PowerShell `Set-Content` adds a UTF-8 BOM, and
  `scripts/check-vault.mjs` requires each note to begin with `---`. Use an editor-style write.
- `brainobs/.obsidian/` is gitignored, so the Obsidian workspace configuration is machine-local
  and not shareable. Only the `.md` files are tracked.

Run `npm run check:vault` from the repository root after any vault edit. The script resolves the
vault as `join(process.cwd(), 'brainobs')` and throws `ENOENT` from anywhere else.

Detail: [[Vault Maintenance]], [[Context Sync Protocol]].

## If pushing is authorized

```text
1  Fetch and check for divergence
2  Stage only intended files
3  Use the conventional prefix and bullet body
4  Recheck divergence before the push
5  Never force push
6  Report the final Git state
```

## Reporting

After finishing, report what changed, what was verified, remaining limitations, and the final Git
state. Do not describe verification that did not happen. List every file touched, and separate
ignored or untracked paths from tracked ones.