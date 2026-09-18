---
title: Bionic Reading
type: feature
status: verified
updated: 2026-09-18
tags: [bookflow, reader, bionic, typography]
source-files: [src/features/reader/lib/textFormatter.js, src/features/reader/lib/salienceFormatter.js, src/features/reader/lib/textFormatter.test.js, src/features/reader/config.js]
---

# Bionic Reading

Opt-in fixation weighting that bolds the first letters of each word to guide saccadic eye
movement. Disabled by default (`bionic: false`).

## Fixation rule

`getFixationLength(wordLength)` in `textFormatter.js`:

| Word length | Fixation characters |
| --- | --- |
| 0 | 0 |
| 1 to 2 | 1 |
| 3 to 5 | 2 |
| 6 to 8 | 3 |
| 9 to 12 | 4 |
| 13 or more | 6 |

The function is pure and unit tested in `textFormatter.test.js` against the boundary values.

## Rendering

`formatParagraphText` splits the paragraph on words, computes the fixation length, and returns
a React element tree:

```text
anchor = word.slice(0, fixLen)   -> bold element
rest   = word.slice(fixLen)      -> plain text node
```

No HTML strings. No `dangerouslySetInnerHTML`. This is the invariant that makes rendering
untrusted book text safe by construction.

Detail: [[Invariants]].

## Salience formatting

`salienceFormatter.js` extends the same idea to important words rather than all words. It
imports `getFixationLength` and applies weighting only to words it judges salient, so the
result reads as emphasis instead of a uniform bold texture.

## Why opt-in

Bionic emphasis changes the look of every paragraph. Some readers find it accelerates reading;
others find it visually noisy. The default stays standard typography, and the toggle lives in
the reading settings panel.

## Interaction with other features

| Feature | Interaction |
| --- | --- |
| Focus rail | Independent. Focus styling applies to the paragraph, fixation applies within it |
| Typefaces | Works with all typefaces, tuned for serif and sans |
| Letter tracking | Independent of fixation length |
| Reduced motion | Unaffected. Fixation is a static style, not an animation |

## Planned extension

Code token salience: weight syntax keywords and control-flow tokens for technical Markdown so
engineers can skim code listings with the same anchoring. See [[Concept Graph]] and
[[Roadmap MOC]].

Detail: [[Typography System]], [[Cognitive Ergonomics]].