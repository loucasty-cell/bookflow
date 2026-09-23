---
title: Everand Scribd Research
type: research
status: verified
updated: 2026-09-23
tags: [bookflow, competitor, everand, scribd, subscription]
source-files: [brainobs/09-Competitor Research/Competitor Research MOC.md]
---

# Everand Scribd Research

Formerly Scribd. A subscription reading service that reversed the usual model: instead of
unlimited access, plans grant a fixed number of monthly title unlocks. It is also the clearest
example of bundling a separate app purely to own the habit layer.

Evidence: official App Store listing, evidence quality **medium**.

Source: `https://apps.apple.com/us/app/everand-audiobooks-ebooks/id542557212`

## Plans and the unlock model

| Plan | Price | What it grants |
| --- | --- | --- |
| Standard | 11.99 USD per month | Unlock 1 title per month |
| Plus | 16.99 USD per month | Unlock 3 titles per month |
| Deluxe | 28.99 USD per month | Unlock 5 titles per month, purchase on web |

Catalog scope: 1.5M bestsellers and new releases. Trial: 30 days on web with one free title, 7 days
via the App Store.

The unlock mechanic is the interesting part. It is a **scarcity** device: you have three unlocks,
so choosing carefully matters. That is the opposite of the scroll-forever model, and it is the
opposite of what unlimited subscriptions do.

## Reader features

### Ebook

| Feature | Description |
| --- | --- |
| Offline downloads | Read without network |
| Notes and annotations | Standard annotation |
| Bookmarks | Position saving |
| Font size and family | Adjustable |
| Background color | Adjustable |
| Horizontal or vertical scrolling | Reader chooses page or scroll |

### Audiobook

| Feature | Description |
| --- | --- |
| Narration speed | Adjustable |
| Sleep timer | Stop after a duration |
| Offline downloads | Listen without network |
| Progress and time display | Customizable |
| Skip intervals | Customizable |
| Bookmarks | Audio bookmarks |

## Fable Plus: the habit layer, outsourced

The most instructive detail in the entire research set. Everand bundles a sister app, Fable,
free with every subscription, described as "a reading companion for your life beyond the page".

| Fable element | Description |
| --- | --- |
| Automatic activity link | Everand activity updates Fable with no manual tracking |
| Reading streak | Track consecutive reading |
| Personal goals | Reader-set targets |
| Stats and insights | Reading habit analytics |
| Social discovery | See what other readers are loving |

The strategic read is **inferred** but well supported by the listing: Everand keeps the reader app
focused on content and delegates streaks, goals, stats, and social to a companion app. The habit
layer is intentionally separate from the reading surface.

That is a design pattern, not a manipulative one. It answers the question "where does the streak
UI live?" with: not inside the book.

## Lessons for Bookflow

| Lesson | Bookflow action |
| --- | --- |
| Separate the reading surface from the stats surface | Adopt. Never put streaks or stats inside the reader |
| Reader controls horizontal or vertical scrolling | Already supported via reader mode |
| Font, background, and scroll chosen independently | Already supported; themes add the bundling |
| Sleep timer for audio | Relevant to [[TTS Synchronization]] |
| Unlock scarcity inverts the endless-feed problem | Consider as a **local** session limit, not a paywall |
| Habit data auto-collected, not manually logged | Adopt. Derive stats from real reading, never ask the reader to log it |

The auto-collected detail is important. Everand explicitly markets "no manual tracking needed".
Any Bookflow stats must be derived from genuine reading activity, which also satisfies the
deterministic progress invariant.

## What Bookflow should not copy

- Subscription gating. Bookflow reads the reader's own files.
- Unlock scarcity as a commercial device. Only as a voluntary focus tool, if at all.

Detail: [[Ethical Guardrails]], [[Competitor Mechanics Scorecard]].

Related: [[Bookly and Fable Research]], [[Kindle Research]], [[Library and Reading Stats]].