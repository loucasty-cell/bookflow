---
title: Context Sync Protocol
type: process
status: living
updated: 2026-09-18
tags: [bookflow, process, maintenance, updateability, agent]
source-files: [AGENTS.md, package.json]
---

# Context Sync Protocol

How this vault stays true as the code changes. This is the mechanism that lets a future agent
trust the vault instead of re-deriving everything.

Read this whenever you change code in this repository.

## The rule

```text
A code change is not complete until the vault reflects it.
```

Documentation that lags reality is worse than no documentation, because it produces confident
wrong answers. Treat a stale note as a defect.

## Step 1: Identify affected notes

Use the `source-files` frontmatter field. Every note lists the real repository paths behind its
claims.

```bash
grep -rl "src/features/reader/config.js" brainobs/
```

Any note listing a file you changed is a candidate for an update.

## Step 2: Classify the change

| Change type | Vault action |
| --- | --- |
| New file or module | Add to the relevant structure note and [[File Placement Map]] |
| New constant or default | Update the owning note, and [[Agent Quickstart]] if it is a headline value |
| Changed behavior | Update the owning feature note and re-verify its claims |
| New route | Update [[Backend Endpoints]] |
| New public export | Update [[Frontend Public APIs]] |
| New environment variable | Update [[Environment Config]] |
| New theme or token | Update [[Design Tokens]] and [[Themes and Atmospheres]] |
| Status change | Update [[Current State Matrix]] with evidence |
| New planned feature | Add a spec note and link it from the right MOC |
| Removed feature | Delete or rewrite the note. Never leave a note describing code that is gone |

## Step 3: Update the frontmatter

Every note has four housekeeping fields. All four must stay accurate.

```yaml
---
title: Note Title
type: concept | feature | reference | contract | rules | spec | guide | process | MOC
status: verified | partial | planned | exploratory | living
updated: 2026-09-18
tags: [bookflow, area, topic]
source-files: [src/path/file.js, backend/path/file.py]
---
```

| Field | Update when |
| --- | --- |
| `status` | The implementation reality changes |
| `updated` | Any content change at all |
| `source-files` | You add, rename, or remove backing paths |
| `tags` | The note's scope changes |

Rules for `source-files`:

- Only real paths. A path that does not exist is a broken claim.
- Prefer the most specific files over directories.
- Remove paths when those files are deleted or refactored away.

## Step 4: Keep the graph intact

`brainobs` is a wiki, so links are the update mechanism. When you rename a note:

```bash
grep -rn "\[\[Old Note Name" brainobs/
```

Update every inbound link. Obsidian reports unresolved links in graph view and in the backlink
pane; check both.

### Link integrity rules

| Rule | Reason |
| --- | --- |
| Link only to notes that exist | An unresolved link is a broken promise |
| Link to the MOC from new notes | Otherwise the note is unreachable |
| Add the new note to the relevant MOC list | The MOC is the index |
| Prefer a link over repeating detail | One source of truth per fact |

## Step 5: Prevent duplication

Duplication is how documentation rots. The rule:

```text
One fact, one note. Everywhere else links to it.
```

| Fact | Canonical note |
| --- | --- |
| Core invariants | [[Invariants]] |
| Constants, ports, commands | [[Agent Quickstart]] and [[Environment Config]] |
| Capability status | [[Current State Matrix]] |
| Colour and motion tokens | [[Design Tokens]] |
| The four laws mapping | [[Atomic Habits Framework]] |
| Ethical limits | [[Ethical Guardrails]] |
| OCR gap ladder | [[OCR Decision Tree]] |
| Verification steps | [[Verification Checklist]] |
| Metrics and baselines | [[Success Metrics]] |
| Import unit lifecycle | [[Import Scheduler]] |
| Backend OCR constants | [[Backend OCR Engine]] |

If a second note needs the same fact, link instead of copying. If a table genuinely must exist
in two places, mark one as canonical in a line above it.

## Step 6: Verify before finishing

```bash
# 1. Frontmatter present on every note
grep -rL "^---" brainobs/ --include=*.md

# 2. Every note has an updated field
grep -rL "^updated:" brainobs/ --include=*.md

# 3. Find notes that reference a changed file
grep -rl "src/features/reader/config.js" brainobs/

# 4. Check for unresolved links after a rename
grep -rn "\[\[" brainobs/
```

Then confirm:

- [ ] Every note I touched has a new `updated` date.
- [ ] Every `source-files` path exists in the repository.
- [ ] No note claims a planned feature is implemented.
- [ ] New notes are linked from a MOC.
- [ ] Renamed notes have no orphaned inbound links.
- [ ] [[Current State Matrix]] matches reality.
- [ ] [[00-Dashboard]] still routes correctly to everything.

## Automation

A checker script exists at `scripts/check-vault.mjs`, runnable as:

```bash
npm run check:vault
```

It verifies:

```text
1  every note has frontmatter with title, type, status, updated
2  every source-files path exists on disk
3  every [[wikilink]] resolves to an existing note name
4  every note has at least one inbound link (no orphan notes)
```

It ignores wikilink examples inside fenced code blocks and a small placeholder list, so templates
can show syntax without failing the check.

Run it after any vault edit. A PASS output means:

```text
Notes missing frontmatter: 0
Notes missing required fields: 0
source-files paths that do not exist: 0
Unresolved wikilinks: 0
Notes with no inbound links: 0
```

Still planned for the script, and not yet implemented:

```text
5  no note has an updated date in the future
6  report notes whose source-files changed more recently than their updated date
```

Check 6 is the valuable one: compare each note's `updated` date against the last commit date of
its `source-files`. Any file changed after its note's date is a potential stale note, which turns
maintenance from memory into an automated report.

Add those two checks only with explicit approval, since they add `git` coupling to the script.

## Adding a whole new area

```text
1  Create brainobs/NN-Area Name/ with an "Area Name MOC.md"
2  Add the MOC to [[00-Dashboard]] under Maps of content
3  Give every note frontmatter with accurate source-files
4  Link each note from the MOC
5  Add any new canonical facts to the table in Step 5
```

## Templates

Use these when creating new notes so structure stays consistent:

- [[Feature Spec Template]] - for specifying planned features
- [[Decision Log Template]] - for recording significant decisions and their rationale

## What never goes in this vault

| Never | Reason |
| --- | --- |
| Secrets, tokens, credentials | The vault is in the repository |
| Book text or private documents | Privacy invariant |
| Content copied from copyrighted books | Not the vault's purpose |
| Speculation presented as fact | Destroys trust in the vault |
| Unverified performance numbers | Claims must be measured |

Related: [[Vault Maintenance]], [[Agent Quickstart]], [[Verification Checklist]].