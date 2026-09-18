---
title: Ethical Guardrails
type: rules
status: verified
updated: 2026-09-18
tags: [bookflow, psychology, ethics, rules, strategy]
source-files: [AGENTS.md, Bookflowideas.md, improvements.md, goals.md, src/features/reader/config.js]
---

# Ethical Guardrails

The hard limits. These are not preferences, and they are also Bookflow's competitive strategy.

## The governing principle

Every psychological mechanism must survive one test:

```text
Would the reader still feel good about it after learning exactly how it works?
```

If the answer is no, it does not belong in Bookflow, no matter how well it performs.

## Product-level "never" list

| Never | Why |
| --- | --- |
| Infinite feeds | Not a reading product |
| Variable-ratio reward loops | Gambling mechanics applied to attention |
| Streak punishment | Manufactures loss aversion around an invented number |
| Loot boxes or random rewards | No payout randomization in a reader |
| Fake urgency or countdowns | Fabricated scarcity |
| Interrupting notifications | Retention by intrusion |
| Autoplay of the next chapter | Removes the reader's stop decision |
| Guilt copy after an absence | Punishes rest |
| Engagement-inflated progress | Makes the honest signal worthless |

Source: `AGENTS.md`, `Bookflowideas.md`, `goals.md`.

## Language rules

The product documentation prescribes broad language discipline:

Use flow, momentum, and completion. Avoid the vocabulary of addiction and manipulation.

| Approved wording | Disallowed wording |
| --- | --- |
| "Support a sustainable daily reading habit" | "Makes you addicted" |
| "Places the active paragraph near the golden ratio line" | "Guarantees better comprehension" |
| "Optional local OCR acceleration is available" | "Eliminates eye strain" |
| "Processes documents on your device by default" | "Understands every PDF perfectly" |
| "Uses native PDF text when available and OCR when needed" | "OCR is 100 percent accurate" |
| "Heuristic structure detection" | "AI knows where the real book starts" |

## Store-readiness language

Never claim these unless the capability is implemented and verified:

| Claim | Requires |
| --- | --- |
| Web-ready | A responsive app verified in browsers. This is where Bookflow stands |
| PWA-ready | Manifest, icons, service worker, offline behavior, install flow all tested |
| Native-store-ready | Platform packaging, permissions, signing, store assets, device testing |
| Published | Acceptance and public availability in the named store |

Visual polish alone makes Bookflow web-polished. It does not make it store-ready.

Detail: [[Roadmap MOC]].

## Reward mechanism rules

| Rule | Implementation consequence |
| --- | --- |
| Behavioral features are opt-in | `showRewardCapsules` and `showInterventionModals` default `false` |
| Never block reading | Capsules are dismissible overlays, never gates |
| Respect reduced motion | Spring physics disabled, content still delivered |
| Deterministic progress | Derived from position only |
| Substantive reward content | Capsules carry real insight, not praise |
| Single-action dismissal | No multi-step dismissal, no ranking prompt |

Detail: [[Reward Capsules]], [[Intervention Engine]].

## Privacy ethics

| Rule | Consequence |
| --- | --- |
| Content stays local by default | The backend is opt-in and disclosed |
| Disclose when content leaves | Explicit upload messaging before the scan |
| Always offer cancellation | Frontend cancel plus backend job cancel |
| Never log content | No page text or image bytes in logs |
| Hash, never upload, for social | SHA-256 paragraph digests only |

Detail: [[Privacy Model]], [[Social Resonance]].

## Why these are competitive, not limiting

The market is saturated with apps optimized to maximize time-in-app. That optimization
frequently works against the reader's actual goal, which is to finish books.

Bookflow's position is the inverse: optimize for books finished, sessions resumed, and
attention respected. That position has three advantages:

1. It is defensible. Manipulative mechanics are increasingly scrutinized, regulated, and
   distrusted.
2. It is differentiated. A calm, private, fast reader is rare in a market of ad-driven readers.
3. It compounds. A reader who trusts the app with a 600 page textbook is a reader who returns.

## How to handle a conflict

When a growth idea conflicts with a guardrail:

```text
1  State the conflict plainly
2  Offer the ethical variant of the same mechanism
3  Document the trade-off in the relevant note
4  Escalate to the user rather than silently choosing
```

Example of a resolved conflict: the variable reward capsule. The growth version would be a
randomized payout. The Bookflow version keeps unannounced timing but makes the content
substantive and deterministic, which preserves the anticipation without the gambling mechanic.

Detail: [[Atomic Habits Framework]], [[Reward Capsules]].

## Review checklist

- [ ] Does any new feature interrupt a reader who did not opt in?
- [ ] Does any new metric inflate beyond real reading?
- [ ] Does any copy imply a consequence that is not true?
- [ ] Does any mechanic create loss aversion around an invented number?
- [ ] Would the reader still approve if they read the implementation?

Related: [[Invariants]], [[Competitor Analysis]], [[Roadmap MOC]].