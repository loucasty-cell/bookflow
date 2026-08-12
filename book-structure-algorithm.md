# Bookflow Structure and Reading-Phase Algorithm

## Status

This is an implementation specification for a future Bookflow feature. It matches the current React/Vite application and normalized `book.chapters` data model, but it is not implemented yet. The algorithm is designed to run entirely in the browser without a backend, AI service, or new dependency.

The system may target 90% or better agreement with human labels, but that accuracy must be measured on a representative test corpus before it is claimed. The fail-safe rule is to keep uncertain content visible and focusable.

## Purpose

The algorithm has two connected responsibilities:

1. Detect the structural role of each PDF page or ebook section.
2. Decide whether Bookflow should show the text normally, apply gentle focus, or use the full sentence highlight.

It should recognize:

- Front matter that readers commonly scan rather than read closely.
- Introductions and authorial context.
- The beginning of the main body.
- The immersive middle of the main body.
- The closing or resolution section.
- Back matter such as references and indexes.

The algorithm never deletes or permanently hides a section. It changes only the default focus behavior and may offer to begin at the detected main body.

## Current Bookflow compatibility

The current parser already returns this structure:

```js
{
  title: 'Book title',
  author: 'Author name',
  kind: 'PDF',
  chapters: [
    {
      title: 'Page 1',
      paragraphs: ['Readable paragraph text.']
    }
  ]
}
```

For PDFs, one unit is normally one parsed page. For EPUB and Markdown, one unit is normally a chapter or heading section. The algorithm uses the neutral term `unit` so the same implementation supports every current format.

## Output contract

```js
{
  version: '1.0.0',
  units: [
    {
      index: 0,
      title: 'Introduction',
      role: 'INTRODUCTION',
      confidence: 0.91,
      phase: 'GLANCE',
      displayPolicy: 'SHOW_ONLY',
      focusEligible: false,
      reasonCodes: ['TITLE_INTRODUCTION', 'EARLY_POSITION']
    }
  ],
  boundaries: {
    bodyStart: 4,
    immersionStart: 6,
    closingStart: 24,
    bodyEnd: 26
  },
  confidence: 0.86,
  needsReview: false
}
```

### Structural roles

| Role | Meaning |
| --- | --- |
| `FRONT_MATTER` | Cover, title, copyright, dedication, contents, acknowledgements, or similar material |
| `INTRODUCTION` | Introduction, preface, foreword, prologue, or opening explanation |
| `AUTHORIAL_CONTEXT` | Author's note, personal framing, methodology, or direct author-to-reader context |
| `MAIN_BODY` | The primary narrative, argument, lesson, or chapter content |
| `CONCLUSION` | Conclusion, resolution, final chapter, closing reflection, or epilogue |
| `BACK_MATTER` | Appendix, references, bibliography, glossary, index, credits, or about-the-author material |
| `UNKNOWN` | Evidence is too weak or conflicting |

`AUTHORIAL_CONTEXT` means that the text is likely framing from the author, not that the algorithm has proved who is speaking. First-person fiction must not be classified as authorial voice from pronouns alone.

### Reading phases

| Phase | Meaning |
| --- | --- |
| `GLANCE` | Opening material that is usually scanned or selectively read |
| `ENTERING` | Transition from introduction into the main body |
| `IMMERSION` | Stable main-body reading where sentence focus should be strongest |
| `RESOLUTION` | Closing main content where focus should continue through the ending |
| `REFERENCE` | Back matter intended mainly for lookup |

### Display policies

| Policy | Reader behavior |
| --- | --- |
| `SHOW_ONLY` | Keep all text visible but do not select it for automatic sentence focus |
| `SOFT_FOCUS` | Allow automatic focus with reduced highlight strength |
| `HIGHLIGHT` | Use Bookflow's normal bold sentence and pale-blue/red focus treatment |

## Algorithm overview

```text
Normalized book
  -> extract unit features
  -> calculate role scores
  -> decode the most believable role sequence
  -> detect main-body and closing boundaries
  -> assign reading phases
  -> choose show-only, soft-focus, or highlight
  -> apply local user corrections
  -> return confidence and reason codes to the reader
```

## Algorithm A: Book structure detection

### Step 1: Normalize each unit

For each page or section, derive:

```js
{
  index,
  normalizedPosition,
  title,
  text,
  wordCount,
  sentenceCount,
  paragraphCount,
  averageSentenceWords,
  shortness,
  proseDensity,
  referenceDensity,
  firstPersonDensity,
  metaWritingDensity,
  dialogueDensity,
  continuityWithPrevious,
  continuityWithNext,
  titleSignals
}
```

All numeric signals should be normalized to a value from 0 to 1.

### Step 2: Extract signals

#### Position signals

```js
normalizedPosition = index / Math.max(1, totalUnits - 1)
earlyPosition = clamp01((0.15 - normalizedPosition) / 0.15)
middlePosition = 1 - Math.min(1, Math.abs(normalizedPosition - 0.5) / 0.35)
latePosition = clamp01((normalizedPosition - 0.82) / 0.18)
```

Position is supporting evidence only. A long introduction or a short book must not be classified from page percentage alone.

#### Strong title signals

Front matter:

```text
cover, title page, contents, table of contents, copyright,
dedication, acknowledgements, acknowledgments, epigraph
```

Introduction:

```text
introduction, preface, foreword, prologue, opening note
```

Authorial context:

```text
author's note, note from the author, how to use this book,
methodology, why i wrote this book, a message to the reader
```

Main body:

```text
chapter, part, section, lesson, unit, act, volume, book
```

Conclusion:

```text
conclusion, final chapter, closing thoughts, summary,
resolution, epilogue, what comes next
```

Back matter:

```text
appendix, bibliography, references, notes, endnotes,
glossary, index, credits, sources, further reading,
about the author
```

Title matches must use word boundaries so `index` does not match a normal word such as `indexed`.

#### Text-shape signals

- `shortness`: compare unit word count with the median word count of the book, not a fixed number alone.
- `proseDensity`: increase for complete sentences and paragraphs; decrease for short fragments and list-like text.
- `referenceDensity`: increase for years, citation brackets, DOI or URL patterns, ISBN values, repeated names, and alphabetized short entries.
- `firstPersonDensity`: count `I`, `me`, `my`, `we`, `our`, and `us` per 100 words.
- `metaWritingDensity`: count phrases such as `this book`, `this chapter`, `the reader`, `I wrote`, `my purpose`, and `in the following pages`.
- `dialogueDensity`: estimate the share of sentences beginning with quotation marks or containing dialogue punctuation.
- `continuityWithPrevious` and `continuityWithNext`: calculate Jaccard overlap between normalized content-word sets from neighboring units.

First-person density is weak evidence. It becomes useful for `AUTHORIAL_CONTEXT` only when combined with an explicit title, author name, meta-writing language, or opening/closing position.

### Step 3: Calculate raw role scores

Each role receives a weighted score. Suggested initial weights are shown below and must be calibrated with labeled books.

| Evidence | Front | Intro | Authorial | Main | Conclusion | Back |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Exact role-title signal | 9 | 9 | 9 | 6 | 9 | 10 |
| Early position | 2 | 2 | 1 | -1 | -3 | -2 |
| Middle position | -2 | -1 | 0 | 2 | 0 | -2 |
| Late position | -3 | -2 | 1 | -1 | 3 | 3 |
| Shortness | 2 | 0.5 | 0.5 | -1 | 0 | 1 |
| Prose density | -1 | 1 | 1 | 3 | 2 | -2 |
| Reference density | 0 | -1 | 0 | -3 | -1 | 5 |
| Meta-writing density | 0 | 2 | 3 | -0.5 | 1 | 0 |
| First-person density | 0 | 0.5 | 1 | 0 | 0.5 | 0 |
| Neighbor continuity | -0.5 | 0.5 | 0.5 | 2 | 1 | -0.5 |
| Explicit chapter-like title | -5 | -2 | -1 | 5 | 0 | -4 |

The implementation should calculate:

```js
roleScore = bias[role] + sum(weight[role][feature] * featureValue)
roleProbability = softmax(roleScores)
```

The highest raw probability is not accepted immediately because book structures normally follow an ordered sequence.

### Step 4: Decode the book sequence

Use a small dynamic-programming decoder similar to Viterbi. This prevents one unusual page from breaking a stable main-body run.

Preferred progression:

```text
FRONT_MATTER
  -> INTRODUCTION or AUTHORIAL_CONTEXT
  -> MAIN_BODY
  -> CONCLUSION
  -> BACK_MATTER
```

Allowed behavior:

- A role may repeat for any number of units.
- A book may start directly with `MAIN_BODY`.
- Introduction and authorial context may appear in either order.
- A book may finish in `MAIN_BODY` without a labeled conclusion.
- Backward jumps receive a strong penalty but are not impossible when evidence is overwhelming.
- `UNKNOWN` may appear between any two roles when confidence is low.

```js
function decodeRoles(emissions, transitions) {
  const cost = emissions.map(() => new Map())
  const parent = emissions.map(() => new Map())

  for (const role of ROLES) cost[0].set(role, -Math.log(emissions[0][role]))

  for (let index = 1; index < emissions.length; index += 1) {
    for (const role of ROLES) {
      let bestPrevious = null
      let bestCost = Number.POSITIVE_INFINITY

      for (const previous of ROLES) {
        const candidate = cost[index - 1].get(previous)
          + transitions[previous][role]
          - Math.log(emissions[index][role])

        if (candidate < bestCost) {
          bestCost = candidate
          bestPrevious = previous
        }
      }

      cost[index].set(role, bestCost)
      parent[index].set(role, bestPrevious)
    }
  }

  return backtrackLowestCostPath(cost, parent)
}
```

### Step 5: Calculate confidence

Unit confidence should combine:

- The difference between the best and second-best role probability.
- Agreement between raw scoring and sequence decoding.
- Agreement with neighboring roles.
- Strength of explicit title evidence.

```js
confidence = clamp01(
  0.45 * probabilityMargin
  + 0.25 * sequenceAgreement
  + 0.20 * neighborAgreement
  + 0.10 * explicitSignalStrength
)
```

If confidence is below `0.55`, assign `UNKNOWN`. An explicit user correction always overrides the prediction.

## Algorithm B: Reading-phase and highlight policy

### Step 1: Detect boundaries

#### Main-body start

Choose the first unit that satisfies one of these conditions:

1. Two consecutive `MAIN_BODY` units have confidence of at least `0.65`.
2. One unit has an explicit chapter-like title, `MAIN_BODY` confidence of at least `0.80`, and the next unit is not front matter.
3. No reliable boundary exists, so use the first unit and set `needsReview` to `true`.

Do not auto-jump to the detected start unless `bodyStart` confidence is at least `0.80`. Even then, the reader must be able to navigate back to every earlier unit.

#### Immersion start

Within the main body, choose the earliest unit where:

- At least two consecutive units are `MAIN_BODY`.
- Average main-body confidence is at least `0.70`.
- Neighbor continuity is stable.
- The unit is at least 5% into the detected main-body range.

If optional session behavior is available, immersion may begin earlier when forward reading is stable and the reader is not rapidly skipping pages.

#### Closing start

Choose the earliest of:

1. A `CONCLUSION` unit with confidence of at least `0.70`.
2. The start of a stable closing-title sequence.
3. The final 12% of the detected main-body range when no explicit conclusion exists.

#### Main-body end

Choose the last `MAIN_BODY` or `CONCLUSION` unit before a stable `BACK_MATTER` run. A single uncertain unit must not terminate the main body.

### Step 2: Assign phases

```js
function assignPhase(unit, boundaries) {
  if (unit.role === 'BACK_MATTER') return 'REFERENCE'
  if (unit.index < boundaries.bodyStart) return 'GLANCE'
  if (unit.index < boundaries.immersionStart) return 'ENTERING'
  if (unit.index < boundaries.closingStart) return 'IMMERSION'
  if (unit.index <= boundaries.bodyEnd) return 'RESOLUTION'
  return 'REFERENCE'
}
```

### Step 3: Choose the display policy

| Role or condition | Confidence | Policy |
| --- | ---: | --- |
| Front matter | `>= 0.78` | `SHOW_ONLY` |
| Introduction | `>= 0.84` | `SHOW_ONLY` |
| Authorial context | `>= 0.84` | `SOFT_FOCUS` |
| Main body | `>= 0.55` | `HIGHLIGHT` |
| Conclusion | `>= 0.55` | `HIGHLIGHT` |
| Back matter | `>= 0.78` | `SHOW_ONLY` |
| Unknown or low confidence | Any | `SOFT_FOCUS` |
| User-marked include | Any | `HIGHLIGHT` |
| User-marked exclude | Any | `SHOW_ONLY` |

This policy protects the ending: conclusions and the final main-body units continue to receive full sentence highlighting. References and indexes remain visible but do not compete for automatic focus.

### Optional session-based immersion score

The structure classifier works without tracking reader behavior. A later version may refine the reading phase from local session signals:

```js
immersionScore = clamp01(
  0.35 * mainBodyProbability
  + 0.20 * forwardScrollStability
  + 0.15 * readingCadenceStability
  + 0.15 * visibleTextDwellFit
  + 0.10 * returnAfterPause
  + 0.05 * meaningfulInteraction
)
```

Definitions:

- `forwardScrollStability`: steady forward movement without rapid page skipping.
- `readingCadenceStability`: consistent time between meaningful scroll changes.
- `visibleTextDwellFit`: enough time for the visible word count at a reasonable reading speed.
- `returnAfterPause`: resuming near the previous position.
- `meaningfulInteraction`: pin, bookmark, or note use; this must have a low weight so quiet readers are not penalized.

Behavioral signals must stay on the device. They must not be presented as psychological certainty, and the reader must remain usable when tracking is disabled.

## Local correction and system improvement

### Manual correction controls

Bookflow should eventually let a reader choose:

- `Start main reading here`.
- `Include this section in focus`.
- `Show this section without focus`.
- `Mark as introduction`, `main body`, `conclusion`, or `reference`.

Corrections should be saved with the existing document identity and take priority over predictions.

```js
{
  algorithmVersion: '1.0.0',
  bodyStartOverride: 4,
  unitOverrides: {
    2: { role: 'INTRODUCTION', displayPolicy: 'SHOW_ONLY' },
    4: { role: 'MAIN_BODY', displayPolicy: 'HIGHLIGHT' }
  }
}
```

### Feedback record

For local debugging and future calibration, store only structural feedback:

```js
{
  documentId,
  algorithmVersion,
  unitIndex,
  predictedRole,
  correctedRole,
  predictedPolicy,
  correctedPolicy,
  confidence,
  reasonCodes
}
```

Do not store full book text in feedback. Do not upload feedback unless a future interface obtains explicit consent and explains exactly what will be transmitted.

### Rule improvement process

1. Collect corrections locally.
2. Export an optional developer test fixture without copyrighted paragraph text.
3. Add a legally usable labeled book or synthetic structure fixture to the test corpus.
4. Recalculate weights against the training portion only.
5. Validate on books that were not used for calibration.
6. Increment `algorithmVersion` when rules or weights change.
7. Keep old overrides compatible or migrate them explicitly.

## React/Vite integration plan

Suggested future files:

```text
src/features/reader/
|-- hooks/
|   `-- useReadingPhase.js
|-- lib/
|   |-- bookStructureAnalyzer.js
|   |-- bookStructureAnalyzer.test.js
|   |-- readingPolicy.js
|   `-- readingPolicy.test.js
`-- index.js
```

Create these files only when implementation begins. No new package is required.

### Application integration

```js
const structure = useMemo(
  () => analyzeBookStructure(book, savedStructureOverrides),
  [book, savedStructureOverrides],
)

const chapters = useMemo(
  () => enrichChapters(book.chapters, structure.units),
  [book, structure],
)
```

Each enriched chapter should expose:

```js
{
  structuralRole: 'MAIN_BODY',
  structureConfidence: 0.93,
  readingPhase: 'IMMERSION',
  displayPolicy: 'HIGHLIGHT',
  focusEligible: true,
  structureReasons: ['CHAPTER_TITLE', 'PROSE_DENSITY', 'SEQUENCE_MAIN_RUN']
}
```

The existing reader can keep using `focusEligible`. Later styling may use `displayPolicy` to select the normal, soft, or full focus appearance.

### Performance requirements

- Analyze a unit once per imported book, not on every scroll event.
- Use `useMemo` or a dedicated worker only if measured parsing time requires it.
- Keep scoring linear in the number of units and words.
- Limit continuity comparison to neighboring units.
- Store compact roles, confidence values, policies, boundaries, and overrides rather than full extracted text.
- Keep the current scroll focus calculation separate from structure analysis.

## Accuracy validation plan

The algorithm must not be described as 90% accurate until it passes a documented evaluation.

### Evaluation corpus

Use at least 200 legally usable books or structured fixtures covering:

- Fiction and nonfiction.
- Textbooks and technical books.
- Essays, biographies, and self-help books.
- Short and long books.
- PDF, EPUB, TXT, and Markdown.
- Books with no introduction or no explicit conclusion.
- Books with first-person narrators.
- Books with long appendices, endnotes, or references.

Split the corpus by book, not by page, so pages from the same book cannot appear in both calibration and validation data.

### Required metrics

| Metric | Release target |
| --- | ---: |
| Main-body start within 2 PDF pages or 1 ebook section | `>= 90%` of books |
| Main-body end within 2 PDF pages or 1 ebook section | `>= 90%` of books |
| Macro F1 across structural roles | `>= 0.90` |
| Show/highlight policy agreement with human labels | `>= 90%` |
| Main-body units incorrectly set to `SHOW_ONLY` | `< 1%` |
| Books left without any highlightable main content | `0%` |

False suppression of real main content is the most serious error. If that target fails, the confidence threshold must increase or uncertain units must fall back to `SOFT_FOCUS`.

### Test cases required before implementation is complete

1. Title page, contents, introduction, three chapters, conclusion, and references.
2. A novel beginning directly with Chapter One.
3. A first-person novel that must remain `MAIN_BODY`.
4. A nonfiction book with an author's note and long introduction.
5. A textbook with a glossary, bibliography, and index.
6. A short book with only two sections.
7. An EPUB with useful chapter titles.
8. A PDF where every unit title is only `Page N`.
9. A book with no recognizable headings.
10. A manual override that survives reopening the same file.

## Safety and fallback rules

- Never delete or omit a page from navigation.
- Never auto-jump past uncertain content.
- Never disable focus for uncertain main-body text.
- Never classify first-person narration as authorial voice from pronouns alone.
- Never send text, features, or corrections to a remote service without explicit approval.
- If every unit becomes non-focusable, restore all units to `SOFT_FOCUS`.
- Show a small explanation such as `Detected as introduction` and allow correction.
- Preserve manual corrections across algorithm upgrades whenever possible.

## Definition of done

This algorithm is ready to be called implemented only when:

- The analyzer and policy modules exist in the reader feature.
- Unit roles, boundaries, confidence, policies, and reason codes are returned.
- The current focus rail uses the returned policy without pointer-based selection.
- Manual include/exclude and body-start overrides work.
- Overrides persist locally for the same document.
- Unit, integration, and representative document tests pass.
- Desktop and mobile reader behavior is verified.
- Lint, tests, and the production build pass.
- The measured accuracy report is published with its corpus and methodology.
