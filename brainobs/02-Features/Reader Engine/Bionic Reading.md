---
title: Bionic Reading
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, reader, bionic, typography]
source-files: [src/features/reader/lib/textFormatter.js, src/features/reader/lib/salienceFormatter.js, src/features/reader/lib/textFormatter.test.js, src/features/reader/config.js]
---

# Bionic Reading

Opt-in fixation weighting that bolds the first letters of each word to guide saccadic eye movement.
Disabled by default: `bionic: false` in `DEFAULT_SETTINGS` at `src/features/reader/config.js:12`.
Neither fixation nor salience is on unless the reader turns it on.

## Fixation rule

`getFixationLength(wordLength)` in `textFormatter.js:4`:

| Word length | Fixation characters |
| --- | --- |
| 0 | 0 |
| 1 to 2 | 1 |
| 3 to 5 | 2 |
| 6 to 8 | 3 |
| 9 or more | `max(3, ceil(length * 0.45))` |

The long-word branch is a proportional rule with a floor of 3, not a fixed table. A 9-letter word
gets 5 characters and a 20-letter word gets 9.

The function is pure and unit tested in `textFormatter.test.js` against the boundary values.

## Rendering

`formatParagraphText(text, options)` in `textFormatter.js:12` returns a React element tree:

```text
token -> /^([^\p{L}\p{N}]*)([\p{L}\p{N}]+)(.*)$/u
prefix + <b className="fixation-anchor">anchor</b> + rest + suffix
```

Every token becomes a `span.bionic-token` built with `React.createElement` (`textFormatter.js:33-41`).
The prefix and suffix slices keep leading punctuation and trailing marks outside the bold run, so
`"Hello,"` does not bold the comma. When `bionic` is falsy the function returns the raw string
untouched (`textFormatter.js:14`), which is the common path.

No HTML strings. No `dangerouslySetInnerHTML`. This is the invariant that makes rendering untrusted
book text safe by construction.

Detail: [[Invariants]].

## Salience formatting

`salienceFormatter.js` weights important words rather than all words, so the result reads as
emphasis instead of a uniform bold texture.

| Export | Line | Role |
| --- | --- | --- |
| `LOW_SALIENCE_PARTICLES` | `salienceFormatter.js:10-16` | 50 stopwords that are never emphasised |
| `isSalientToken` | `salienceFormatter.js:23` | Decides whether a token deserves weight |
| `getSalientFixationLength` | `salienceFormatter.js:36` | Fixation length for a salient token |
| `formatSalientParagraphText` | `salienceFormatter.js:53` | Renders the paragraph |

`formatParagraphText` branches to `formatSalientParagraphText` when `bionic` is the string
`"salience"` or `"syntactic"` (`textFormatter.js:17`). So salience is a mode of the same setting, not
a separate toggle.

The two modules re-export each other's formatter (`textFormatter.js:44` and the matching export in
`salienceFormatter.js`). That mutual re-export forms a circular import which ESM hoisting resolves;
it is intentional, not a defect, and should not be "cleaned up" without running the suite.

## Why opt-in

Bionic emphasis changes the look of every paragraph. Some readers find it accelerates reading;
others find it visually noisy. The default stays standard typography, and the toggle lives in the
reading settings panel.

## Interaction with other features

| Feature | Interaction |
| --- | --- |
| Focus rail | Independent. Focus styling applies to the paragraph, fixation applies within it |
| Typefaces | Works with all typefaces, tuned for serif and sans |
| Letter tracking | Independent of fixation length |
| Themes | Works under all five themes; see [[Themes and Atmospheres]] |
| Reduced motion | Unaffected. Fixation is a static style, not an animation |

## Planned extension

Code token salience: weight syntax keywords and control-flow tokens for technical Markdown so
engineers can skim code listings with the same anchoring. This is not implemented; do not describe it
as shipped. See [[Concept Graph]] and [[Roadmap MOC]].

Detail: [[Typography System]], [[Cognitive Ergonomics]], [[Reader Engine MOC]].