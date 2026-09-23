---
title: Kindle Research
type: research
status: verified
updated: 2026-09-23
tags: [bookflow, competitor, kindle, amazon]
source-files: [brainobs/09-Competitor Research/Competitor Research MOC.md]
---

# Kindle Research

The reference implementation. Kindle is the app most readers compare everything else to, and its
feature list is the baseline expectation for "a real reading app".

Evidence: official App Store listing copy, evidence quality **medium**. Feature set is
first-party described; internal implementation is not claimed.

Source: `https://apps.apple.com/us/app/amazon-kindle/id302584613`

## Feature inventory

### Library and access

| Feature | What it does |
| --- | --- |
| Automatic purchase sync | Purchased books appear in the app without an import step |
| Subscription downloads | Kindle Unlimited and Prime members download in-app |
| Free samples | Try any book straight from the app before buying |
| Collections | Organize into user-defined collections |
| Six million titles | Catalog depth as a discovery surface |

### Reading customization (the Aa menu)

| Control | Options |
| --- | --- |
| Text size | Adjustable |
| Font type | Multiple families |
| Margins | Adjustable |
| Text alignment | Adjustable |
| Orientation | Portrait or landscape |
| Page turn style | Left-to-right turning or continuous scroll |
| Brightness | Adjustable, with day and night comfort |
| Background color | Multiple background colors |

### Comprehension aids

| Feature | What it does |
| --- | --- |
| Built-in dictionary | Tap and hold a word for its definition |
| X-Ray | Look up people and places in the book |
| Wikipedia lookup | External context without leaving the book |
| Instant translation | Inline translation |
| Search within book | Locate passages |

This cluster is Kindle's strongest differentiator and the most under-copied feature set in the
category. It reduces the "I do not remember this name" cost that kills long non-fiction.

### Progress

| Feature | What it does |
| --- | --- |
| Percent read | Position in the book |
| Real page numbers | For most top titles, matching print |
| Time left in chapter | Estimated from **actual reading speed** |
| Time left in book | Same basis |
| Page Flip | Bird's-eye skim view that saves your place |

The time-left estimate is the standout. It converts an abstract remainder into a legible,
personalized cost. Kindle derives it from the reader's own measured speed, not a global constant.

### Retention and annotation

| Feature | What it does |
| --- | --- |
| Bookmarks | Revisit points |
| Highlights | Text marking |
| Notes | Margin annotations |
| My Notebook | All notes in one place |
| Cross-device sync | Position, highlights, notes, and bookmarks follow the reader |
| Whispersync with Audible | Switch between reading and listening mid-book |
| New release alerts | Author notifications |

## What actually drives daily use

| Mechanic | Real driver | Honest assessment |
| --- | --- | --- |
| Library sync | Zero-friction return | Genuine. Removes the re-import tax |
| Real page numbers | Orientation | Genuine. Readers trust "page 214 of 380" more than "47 percent" |
| Time left in chapter | Planning | Genuine. Answers "can I finish this?" |
| My Notebook | Accumulated value | Genuine. The notes are the switching cost |
| Cross-device sync | Continuity | Genuine, and the single biggest lock-in |
| Catalog depth | Discovery | Commercial, not a reading mechanic |
| New release alerts | Re-engagement | Marketing, and it competes with the current book |

## Lessons for Bookflow

| Lesson | Bookflow action |
| --- | --- |
| Time left is computed from the reader's own speed | Adapt. Track local reading speed and personalize the estimate |
| Real page or unit numbers beat percentages | Adapt. Show chapter and unit position alongside percent |
| Comprehension aids reduce abandonment | Adapt partially. A local definition lookup needs a bundled dictionary |
| Page Flip solves look-back | Adapt. A lightweight skim and look-back surface |
| Sync is the real lock-in | Defer. Local-first means no server; portability comes from export instead |
| Catalog is not a reading feature | Reject. Out of scope permanently |

Detail: [[Massive Upgrade Backlog]], [[Audit Compare Replan]].

## What Bookflow should not copy

- Store and catalog surfacing inside the reader.
- New-release alerting during reading.
- Any surface that competes with the open book for attention.

Detail: [[Ethical Guardrails]].

Related: [[Competitor Mechanics Scorecard]], [[Apple Books Research]], [[Library and Reading Stats]].