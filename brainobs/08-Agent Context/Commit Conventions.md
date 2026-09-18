---
title: Commit Conventions
type: reference
status: verified
updated: 2026-09-18
tags: [bookflow, process, git, commits]
source-files: [AGENTS.md, .agents/skills/jules-agent]
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
pytest backend/tests/
npx pyright
```

Detail: [[Verification Checklist]].

## Review the diff for

| Check | Reason |
| --- | --- |
| Unrelated files | Keep the change focused |
| Secrets or tokens | Never commit them |
| Debug output | Remove before committing |
| Generated builds | Do not commit `dist/` |
| Test books or large fixtures | Keep the repository light |
| Local editor files | Obsidian and workspace files must be intentional |
| Unsupported claims | Documentation must match reality |

The Obsidian vault is an intentional exception when the user asks for it to be tracked, but the
workspace cache directory inside it should be excluded.

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
state. Do not describe verification that did not happen.