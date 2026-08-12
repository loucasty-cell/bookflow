# Bookflow API and Data Contracts

Bookflow currently has no backend, REST API, GraphQL API, account service, analytics service, or AI connection. In this document, API means the internal JavaScript interfaces and browser-storage contracts used by the application.

## Current system boundary

```text
Local File
  -> browser File API
  -> local parser
  -> normalized Book object
  -> React reader state
  -> localStorage for preferences and reading state
```

Document contents are not sent over the network by Bookflow. PDF.js and JSZip are application dependencies and run in the browser.

## Document import API

Public exports from `src/features/document-import/index.js`:

```js
parseDocument(file, onProgress)
ACCEPTED_FILES
```

### `parseDocument(file, onProgress)`

Returns a promise that resolves to a normalized book.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `file` | Browser `File` | Local document selected by the user |
| `onProgress` | Optional function | Receives `(percent, label)` parsing updates |

Validation currently accepts:

- `.pdf`
- `.epub`
- `.txt`
- `.md`
- `.markdown`
- Maximum file size: 50 MB

### Normalized book contract

```js
{
  title: 'Book title',
  author: 'Author name',
  kind: 'PDF',
  chapters: [
    {
      title: 'Page 1',
      paragraphs: ['First paragraph.', 'Second paragraph.']
    }
  ]
}
```

`kind` currently resolves to `PDF`, `EPUB`, `TEXT`, or `MARKDOWN`.

### Progress callback contract

```js
onProgress(45, 'Reading your document')
```

- `percent` is a number from 0 to 100.
- `label` is a short user-facing status message.
- PDF progress is reported per page.
- EPUB progress is reported per spine item.

### Import failure messages

The parser provides actionable errors for:

- Missing files.
- Files over 50 MB.
- Unsupported extensions.
- Encrypted, damaged, or unreadable PDFs.
- PDFs without selectable text.
- Invalid or incomplete EPUB packages.
- Documents without readable chapters or text.

Scanned and image-only PDFs require OCR before the current parser can read them.

## Reader data contracts

After import, `App.jsx` enriches each chapter and paragraph for the reader:

```js
{
  title: 'Chapter One',
  focusEligible: true,
  paragraphs: [
    {
      text: 'A complete paragraph.',
      sentences: [
        {
          id: '0-0-0',
          text: 'A complete paragraph.',
          chapterIndex: 0
        }
      ]
    }
  ]
}
```

Sentence identifiers follow `chapterIndex-paragraphIndex-sentenceIndex`. They are stable only while the same parser output and document structure remain unchanged.

## Focus-selection contract

- Automatic focus considers only elements with `data-sentence-id`.
- The target rail is 32% from the top of the reader viewport.
- Focus updates during reader scrolling through `requestAnimationFrame`.
- Pointer hover does not select a sentence.
- Clicking a selectable sentence or pressing Enter or Space pins or unpins it.
- Pinned focus takes priority over automatic scroll focus.

Likely front matter and end matter are excluded from automatic focus using heading, position, and word-count heuristics. This is not semantic or AI classification and may need a future manual override.

## Browser storage API

### Global settings

Key:

```text
bookflow:settings
```

Value:

```js
{
  fontSize: 20,
  lineHeight: 1.9,
  columnWidth: 720,
  focus: 'soft',
  theme: 'paper'
}
```

Supported focus values are `off`, `soft`, and `deep`. Supported themes are `paper` and `dusk`.

### Per-document state

Document identity:

```text
filename:size:lastModified
```

Storage key:

```text
bookflow:document:<document-identity>
```

Stored value:

```js
{
  notes: [
    {
      id: 'generated-uuid',
      sentenceId: '0-0-0',
      quote: 'Focused sentence text.',
      text: 'Reader note.'
    }
  ],
  bookmarks: ['0-0-0'],
  progress: 42,
  scrollTop: 1850
}
```

Book contents are not stored in this object. Notes may contain a user-selected sentence quote.

## Browser capabilities used

| Browser capability | Purpose |
| --- | --- |
| File API | Read a user-selected local file |
| `localStorage` | Persist settings and reading state |
| `Intl.Segmenter` | Split paragraphs into complete sentences |
| Clipboard API | Copy the focused sentence |
| `crypto.randomUUID()` | Create note identifiers |
| `requestAnimationFrame` | Throttle scroll focus calculations |

`Intl.Segmenter` has a regular-expression fallback. Clipboard failures are currently ignored without interrupting reading.

## Future external API rules

No external endpoint is planned as an implemented contract. If synchronization or AI is approved later, the design must be documented before coding and must include:

- Explicit opt-in and a clear explanation of transmitted data.
- Authentication and authorization boundaries.
- Encryption in transit and appropriate encryption at rest.
- Data retention, export, and deletion behavior.
- Request and response schemas with versioning.
- Rate limits and actionable error responses.
- A mode where local reading remains fully usable without the service.
- No document text in logs, analytics, URLs, or error traces.
