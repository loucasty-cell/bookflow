---
title: Vault Maintenance
type: process
status: living
updated: 2026-10-02
tags: [bookflow, process, maintenance, obsidian]
source-files: [brainobs, scripts/check-vault.mjs, package.json]
---

# Vault Maintenance

How to keep `brainobs` trustworthy as an agent context source.

## Why this matters

The vault exists so a future agent or developer reaches near-complete understanding without
re-deriving it from source. That only works if the vault is current. A confidently wrong note is
worse than a missing one.

## Commands run on Windows, not in a POSIX shell

This repository is developed on Windows PowerShell. There is no `grep`, and `--include=*.md`
is a GNU-ism that no PowerShell equivalent honours. **Do not paste GNU `grep` one-liners into
these notes.** The commands below are the ones that actually run here.

| Instead of | Use |
| --- | --- |
| `grep -rL "pat" brainobs/ --include=*.md` | `Get-ChildItem brainobs -Recurse -Filter *.md \| Where-Object { -not (Select-String -Path $_.FullName -Pattern 'pat' -Quiet) } \| Select-Object -ExpandProperty FullName` |
| `grep -rn "pat" brainobs/ --include=*.md` | `Get-ChildItem brainobs -Recurse -Filter *.md \| Select-String -Pattern 'pat' \| Select-Object -ExpandProperty Path -Unique` |
| `grep -rl "pat" brainobs/` | `Get-ChildItem brainobs -Recurse -Filter *.md \| Select-String -Pattern 'pat' \| Select-Object -ExpandProperty Path -Unique` |

`-Filter *.md` is applied by the filesystem provider, so it is both faster and more correct than
a glob passed to a matcher.

## Run the checker from the repository root

`scripts/check-vault.mjs` computes the vault as `join(process.cwd(), 'brainobs')` at lines 16-17.
It has no fallback and no argument. Run it from `C:\Users\ASUS\bookflow`:

```bash
npm run check:vault
```

From any other directory it throws `ENOENT` on the `readdirSync` call. This is the most common
cause of a confusing vault-check failure.

## Never shell-write a note

`check-vault.mjs:33` requires a note to begin with `---`. PowerShell `Set-Content` writes a UTF-8
BOM, so a shell rewrite of a note breaks the frontmatter parse and the note is reported as
missing frontmatter. This has already corrupted three notes.

Use an editor-style file write. PowerShell is permitted for **read-only** inspection only:
`Select-String`, `Get-ChildItem`, `Measure-Object`, `Get-Item`.

## The two-tier design

```text
Stable knowledge    Architecture, contracts, invariants, psychology
                    Changes rarely. High value per read.

Volatile knowledge  Status, versions, test counts, bundle sizes, benchmarks
                    Changes often. Must be re-verified or clearly dated.
```

Volatile facts are always given a date or a status field. Never present a volatile number
without saying when it was measured.

## Keeping volatile facts honest

| Fact type | Treatment |
| --- | --- |
| Test counts | State the date they were counted |
| Bundle sizes | Reference the build output; do not restate as current truth |
| Build durations | Do not record. Too volatile to be a claim |
| Versions | Confirm against `package.json` before editing |
| Capability status | Always carry a `status` field |
| Performance numbers | Only from a measurement, with a date |
| Tool results you did not run | Say "not re-verified" and name the last known result |

If a number cannot be verified, write "to measure" rather than guessing.

## Review cadence

| Trigger | Action |
| --- | --- |
| Any code change | Follow [[Context Sync Protocol]] |
| New dependency | Update [[Tech Stack]] and re-verify the bundle note |
| Version bump | Update the tables in [[Tech Stack]] and [[Agent Quickstart]] |
| New or removed file | Update [[File Placement Map]] |
| New environment variable | Update [[Environment Config]] |
| Status change | Update [[Current State Matrix]] with evidence |
| Feature shipped | Move the note from planned to verified, update links |
| Refactor | Update `source-files` paths, `refactor` status, and the placement map |
| Gate, script, or CI change | Update [[Verification Checklist]] |
| Graph metadata | Reconcile `type`, `status`, `tags`, `aliases`, and MOC links |
| Quarterly | Re-read [[Current State Matrix]] and confirm every row against source |

## Health checks

The automated checker covers the mechanical rules:

```bash
npm run check:vault
```

It reports missing frontmatter, missing required fields, non-existent `source-files` paths,
unresolved wikilinks, and orphan notes. A PASS means zero issues in every category.

Manual checks for anything the script does not cover, on Windows:

```powershell
# Notes missing source-files (allowed for process and graph notes)
Get-ChildItem brainobs -Recurse -Filter *.md |
  Where-Object { -not (Select-String -Path $_.FullName -Pattern '^source-files:' -Quiet) } |
  Select-Object -ExpandProperty FullName

# Every distinct wikilink target, for manual uniqueness review
Get-ChildItem brainobs -Recurse -Filter *.md |
  Select-String -Pattern '\[\[([^\]|#]+)' -AllMatches |
  ForEach-Object { $_.Matches } | ForEach-Object { $_.Groups[1].Value } |
  Sort-Object -Unique

# Notes whose type or status is outside the documented vocabulary
Get-ChildItem brainobs -Recurse -Filter *.md |
  Select-String -Pattern '^(type|status):' |
  ForEach-Object { $_.Line } | Sort-Object -Unique
```

MOC, process, and template notes may legitimately omit `source-files` when they describe the
vault itself rather than code.

## What the checker does not verify

The gate is narrower than it looks. It does **not** check tags, heading structure, naming
convention, date sanity, duplicate basenames, or staleness. Those are conventions you enforce by
reading. See [[Context Sync Protocol]] for the full list and for the two staleness checks that
remain unimplemented.

## The staleness signal

The most useful maintenance check is comparative:

```text
If a file listed in a note's source-files changed after that note's
updated date, the note may be stale.
```

Compare against `git log` per file. A note whose backing code changed but whose date did not is
the highest-risk note in the vault, because it looks authoritative and is wrong.

This comparison is a candidate for the `scripts/check-vault.mjs` automation described in
[[Context Sync Protocol]], where it is check 6.

## Structural rules

| Rule | Reason |
| --- | --- |
| One MOC per numbered area | Predictable navigation |
| Every note linked from at least one MOC | Prevents orphans |
| Folder names numbered `NN-Area Name` | Stable reading order |
| Note names in Title Case | Consistent wikilinks |
| Note names globally unique | The checker resolves by basename only, so duplicates are ambiguous |
| Graph metadata follows [[Context Sync Protocol]] | Stable nodes and meaningful graph edges |
| Templates kept in `Templates/` | Excluded from status reviews |

`Commit Conventions` and `Decision Log Template` were previously reachable only from body links
and no MOC listed them. That was fixed on 2026-10-02: both are now listed in
[[Agent Context MOC]]. The rule stands.

## Obsidian workspace config is machine-local

`.gitignore` contains `brainobs/.obsidian/`. Only the `.md` files are tracked, so the Obsidian
workspace settings, graph state, and plugin configuration are **not** shareable through git.
Do not document anything as though it were shared config.

## What to do with an obsolete note

| Situation | Action |
| --- | --- |
| Feature removed | Rewrite the note as a short historical record, or delete it |
| Feature replaced | Delete the old note, update inbound links |
| Note moved between folders | Fine. Links resolve by basename; keep the name unchanged |
| Idea abandoned | Move it to an exploratory status with a note explaining why |
| Fact proven wrong | Correct it and note the correction |

Never leave a note describing a capability that no longer exists. That is the most damaging
possible stale note, because an agent will try to use or preserve it.

## Adding content correctly

```text
1  Does a note already own this fact?     -> link instead of duplicating
2  Is it a new capability?                -> new note under a numbered area
3  Is it a new area?                      -> new folder with its own MOC
4  Is it a template?                      -> Templates/
5  Link it from a MOC and from [[00-Dashboard]] if it is a new area
6  Set frontmatter: title, type, status, updated, tags
7  Add source-files only when the note cites real repository paths
8  Add `refactor` only when architecture status is part of the note
```

## Related

- [[00-Dashboard]] - the entry point that must stay accurate
- [[Context Sync Protocol]] - the mechanism that keeps notes true
- [[Agent Quickstart]] - the highest-value note, keep it sharp
- [[Current State Matrix]] - the truth table