---
title: Context Sync Protocol
type: process
status: living
updated: 2026-10-02
tags: [bookflow, process, maintenance, updateability, agent]
source-files: [AGENTS.md, package.json, scripts/check-vault.mjs]
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

## Tooling constraint: never shell-write a note

`scripts/check-vault.mjs:33` requires a note to start with the three characters `---`. A PowerShell
`Set-Content` rewrite prepends a UTF-8 BOM, so the file no longer starts with `---`, the note is
reported as missing frontmatter, and the gate fails. This has already corrupted three notes once.

Use an editor-style file write. PowerShell is fine for **read-only** inspection
(`Select-String`, `Get-ChildItem`, `Measure-Object`, `Get-Item`) and nothing else.

## Step 1: Identify affected notes

Use the `source-files` frontmatter field. Every note lists the real repository paths behind its
claims. On Windows PowerShell:

```powershell
Get-ChildItem brainobs -Recurse -Filter *.md |
  Select-String -Pattern 'src/features/reader/config.js' |
  Select-Object -ExpandProperty Path -Unique
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
| Token moved to a different stylesheet | Update [[Design Tokens]] and [[File Placement Map]] |
| Status change | Update [[Current State Matrix]] with evidence |
| Refactor or boundary change | Update `refactor`, `source-files`, and [[File Placement Map]] |
| New planned feature | Add a spec note and link it from the right MOC |
| Removed feature | Delete or rewrite the note. Never leave a note describing code that is gone |

## Step 3: Update the frontmatter

Four required housekeeping fields, all of which must stay accurate. Optional graph fields follow
the conventions below.

```yaml
---
title: Note Title
type: MOC
status: verified
updated: 2026-10-02
tags: [bookflow, area, topic]
source-files: [src/path/file.js,backend/path/file.py]
---
```

| Field | Required | Update when |
| --- | --- | --- |
| `title` | Yes | The note is renamed |
| `type` | Yes | The note's role changes |
| `status` | Yes | The implementation reality changes |
| `updated` | Yes | Any content change at all |
| `tags` | Yes | The note's scope changes |
| `source-files` | No | You add, rename, or remove backing paths |

### `type:` vocabulary

One controlled value from this list:

| Value | Meaning |
| --- | --- |
| `MOC` | Map of content; indexes a folder |
| `concept` | An idea or model |
| `feature` | A shipped or planned user-facing capability |
| `contract` | A boundary shape other code must honour |
| `rules` | Constraints that must not be broken |
| `spec` | A specification |
| `guide` | How to do something |
| `process` | How work is done |
| `reference` | A lookup table or enumeration |
| `evidence` | Measured or externally sourced observations |
| `research` | Investigation of a competitor, market, or topic |
| `strategy` | A chosen direction with reasoning |
| `roadmap` | A sequenced plan |
| `briefing` | A single-note orientation summary |
| `template` | A scaffold for creating new notes |
| `decision` | A recorded decision log |

`research`, `strategy`, `roadmap`, `briefing`, and `template` were added on 2026-10-02 because
notes in the vault already used them without documentation. Do **not** rewrite those notes to fit
a shorter list; extending the vocabulary is the cheaper fix.

### `status:` vocabulary

One controlled value from this list:

| Value | Meaning |
| --- | --- |
| `verified` | Checked against source in this session |
| `partial` | True of part of its subject |
| `planned` | Not implemented yet |
| `exploratory` | Deliberately unsettled |
| `living` | Maintained continuously, e.g. this note |
| `accepted` | A decision that was made and stands |

No note in the vault carries `accepted` today. It is documented because
[[Decision Log Template]] prescribes it in the frontmatter scaffold it hands you, so the first
ADR you write will use it. `decision` is documented for the same reason. Do not let either
value exist in a template without appearing in this table.

### Rules for `source-files`

- Must be **one inline line** in the form `[a,b,c]` with **no spaces**.
- Must be comma-split by the checker, so **no path may contain a comma**.
- Every path must exist on disk, or the gate fails.
- Prefer the most specific files over directories.
- Remove paths when those files are deleted or refactored away.
- Use `[]` for external-only evidence; omit the key only for process or graph notes.

### Graph metadata conventions

Graph metadata is descriptive, not a substitute for links.

| Field | Convention |
| --- | --- |
| `title` | Human-readable title matching the note name when practical |
| `refactor` | Optional `not-started`, `partial`, or `complete`; use only when a note tracks an architecture refactor |
| `tags` | Lowercase kebab-case, with `bookflow` first; reuse existing tags before adding new ones |
| `aliases` | Stable names for renamed or commonly used concepts; do not duplicate a note |

Use body wikilinks for graph edges. Put the structural parent and close relations in the body so
Obsidian backlinks and `check-vault` can see them; do not hide required links only in frontmatter.
A new note is linked from exactly one relevant MOC, and a MOC lists its direct children.

## Step 4: Keep the graph intact

`brainobs` is a wiki, so links are the update mechanism. Wikilinks use the **bare basename** with
no folder prefix, for example `[[Invariants]]`. When you rename a note, on Windows PowerShell:

```powershell
Get-ChildItem brainobs -Recurse -Filter *.md |
  Select-String -Pattern '\[\[Old Note Name' |
  Select-Object -ExpandProperty Path -Unique
```

Update every inbound link. Obsidian reports unresolved links in graph view and in the backlink
pane; check both.

### Link integrity rules

| Rule | Reason |
| --- | --- |
| Link only to notes that exist | An unresolved link is a broken promise |
| Use the bare basename, no folder prefix | The checker resolves by basename only |
| Keep note names globally unique across the whole vault | A duplicate basename makes resolution ambiguous |
| Link to the MOC from new notes | Otherwise the note is unreachable |
| Add the new note to the relevant MOC list | The MOC is the index |
| Prefer a link over repeating detail | One source of truth per fact |

Because the checker resolves notes by **basename only**, moving a note between folders does not
break any wikilink. That is convenient, and it is also the reason names must stay globally
unique.

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
| Verification steps and gate set | [[Verification Checklist]] |
| Metrics and baselines | [[Success Metrics]] |
| Import unit lifecycle | [[Import Scheduler]] |
| Backend OCR constants | [[Backend OCR Engine]] |
| Refactor boundary status | [[Agent Quickstart]] and [[File Placement Map]] |
| Vault integrity mechanics | [[Vault Maintenance]] |

If a second note needs the same fact, link instead of copying. If a table genuinely must exist
in two places, mark one as canonical in a line above it.

## Step 6: Verify before finishing

```powershell
# The authoritative gate. Run from the repository root.
npm run check:vault

# Notes missing source-files (the script does not enforce this)
Get-ChildItem brainobs -Recurse -Filter *.md |
  Where-Object { -not (Select-String -Path $_.FullName -Pattern '^source-files:' -Quiet) } |
  Select-Object -ExpandProperty FullName

# Notes citing a changed file
Get-ChildItem brainobs -Recurse -Filter *.md |
  Select-String -Pattern 'src/features/reader/config.js' |
  Select-Object -ExpandProperty Path -Unique

# Every wikilink target, for manual resolution
Get-ChildItem brainobs -Recurse -Filter *.md |
  Select-String -Pattern '\[\[([^\]|#]+)' -AllMatches |
  ForEach-Object { $_.Matches } | ForEach-Object { $_.Groups[1].Value } |
  Sort-Object -Unique
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

The checker is `scripts/check-vault.mjs`, runnable as `npm run check:vault`. Run it after any
vault edit. It verifies exactly four things:

```text
1  every note has frontmatter with non-empty title, type, status, updated
2  every source-files path exists on disk
3  every [[wikilink]] resolves to an existing note basename
4  every note has at least one inbound link from a different note (no orphans)
```

### How it parses, and the rules that follow

These implementation details are the reason several conventions exist:

| Detail | Line | Consequence |
| --- | --- | --- |
| Frontmatter must start with `---` | `:33` | A UTF-8 BOM breaks the parse. Never shell-write a note |
| Frontmatter key regex is `^([A-Za-z_-]+):` | `:39` | Letters, underscore, and hyphen only. A key with a digit is silently dropped |
| Values are single-line and trimmed | `:39` | No multi-line or folded YAML values |
| Lists are comma-split | `:46`-`:51` | No path in `source-files` may contain a comma |
| Notes resolve by basename only | `:57` | A note can move between folders freely, so names must be globally unique |
| Fenced code blocks are stripped before link scanning | `:92` | Syntax examples inside fences cannot create broken links |
| A small placeholder list is skipped | `:93` | `wikilink`, `Old Note Name`, and `name` never fail the check |
| Vault root is `join(process.cwd(), 'brainobs')` | `:16`-`:17` | **Must run from the repository root or it throws `ENOENT`** |

A PASS prints all five counters at zero, or `FAIL: N issue(s) to fix.` with a non-zero exit.

### What the checker does NOT do

Do not assume coverage it does not have. There is:

- **no tag rule** (no lowercase, no `bookflow` first, no reuse check)
- **no heading rule** (no `# Title`, no single-H1 requirement)
- **no naming-convention rule** (Title Case is a convention, not enforced)
- **no date-sanity rule** (`updated` need only be non-empty; future dates pass)
- **no staleness detection** (nothing compares `updated` against file mtimes or git history)
- **no frontmatter key allowlist** (unknown keys such as `refactor` or `aliases` pass silently)

Still planned for the script, and **not implemented** as of 2026-10-02:

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