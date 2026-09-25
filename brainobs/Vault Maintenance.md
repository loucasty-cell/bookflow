---
title: Vault Maintenance
type: process
status: living
updated: 2026-09-24
tags: [bookflow, process, maintenance, obsidian]
source-files: [brainobs]
---

# Vault Maintenance

How to keep `brainobs` trustworthy as an agent context source.

## Why this matters

The vault exists so a future agent or developer reaches near-complete understanding without
re-deriving it from source. That only works if the vault is current. A confidently wrong note is
worse than a missing one.

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
| Bundle sizes | Reference the benchmark note, do not restate as current truth |
| Versions | Confirm against `package.json` before editing |
| Capability status | Always carry a `status` field |
| Performance numbers | Only from a measurement, with a date |

If a number cannot be verified, write "to measure" rather than guessing.

## Review cadence

| Trigger | Action |
| --- | --- |
| Any code change | Follow [[Context Sync Protocol]] |
| New dependency | Update [[Tech Stack]] and re-verify the bundle note |
| Version bump | Update the tables in [[Tech Stack]] and [[Agent Quickstart]] |
| Status change | Update [[Current State Matrix]] with evidence |
| Feature shipped | Move the note from planned to verified, update links |
| Refactor | Update `source-files` paths, `refactor` status, and the placement map |
| Graph metadata | Reconcile `type`, `status`, `tags`, `aliases`, and MOC links |
| Quarterly | Re-read [[Current State Matrix]] and confirm every row against source |

## Health checks

The automated checker covers the mechanical rules:

```bash
npm run check:vault
```

It reports missing frontmatter, missing required fields, non-existent `source-files` paths,
unresolved wikilinks, and orphan notes. A PASS means zero issues in every category.

Manual greps for anything the script does not cover:

```bash
# Notes missing source-files
grep -rL "^source-files:" brainobs/ --include=*.md

# All wiki links, for manual verification
grep -rn "\[\[" brainobs/ --include=*.md
```

Note: MOC, process, and template notes may legitimately omit `source-files` when they describe
the vault itself rather than code.

## The staleness signal

The most useful maintenance check is comparative:

```text
If a file listed in a note's source-files changed after that note's
updated date, the note may be stale.
```

Compare against `git log` per file. A note whose backing code changed but whose date did not is
the highest-risk note in the vault, because it looks authoritative and is wrong.

This comparison is a candidate for the `scripts/check-vault.mjs` automation described in
[[Context Sync Protocol]].

## Structural rules

| Rule | Reason |
| --- | --- |
| One MOC per numbered area | Predictable navigation |
| Every note linked from exactly one MOC | Prevents orphans |
| Folder names numbered `NN-Area Name` | Stable reading order |
| Note names in Title Case | Consistent wikilinks |
| Graph metadata follows [[Context Sync Protocol]] | Stable nodes and meaningful graph edges |
| Templates kept in `Templates/` | Excluded from status reviews |

## What to do with an obsolete note

| Situation | Action |
| --- | --- |
| Feature removed | Rewrite the note as a short historical record, or delete it |
| Feature replaced | Delete the old note, update inbound links |
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
6  Set frontmatter: title, type, status, updated, tags, source-files
7  Add `refactor` only when architecture status is part of the note
```

Detail: [[Context Sync Protocol]], [[File Placement Map]].

## Related

- [[00-Dashboard]] - the entry point that must stay accurate
- [[Agent Quickstart]] - the highest-value note, keep it sharp
- [[Current State Matrix]] - the truth table