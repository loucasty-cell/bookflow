# Bookflow

Bookflow is a private, browser-based reading space for PDFs, EPUB ebooks, text files, and Markdown. It follows the sentence nearest the reader's natural focus line with a gentle highlight, helping long reading sessions feel calmer and easier to continue.

![Bookflow sentence-focused reader](https://img.shields.io/badge/reader-local--first-284e42) ![React](https://img.shields.io/badge/React-18-61dafb) ![Vite](https://img.shields.io/badge/Vite-6-646cff)

## What works

- Import `.pdf`, `.epub`, `.txt`, `.md`, and `.markdown` files up to 50 MB.
- Extract selectable PDF text locally with PDF.js.
- Read EPUB chapters locally with JSZip and the ebook's package/spine metadata.
- Follow complete sentences automatically as the page scrolls.
- Click or press Enter on a sentence to hold it in focus, then resume the natural flow.
- Choose soft, deep, or disabled focus; adjust font size, line spacing, and page width.
- Switch between warm paper and dusk reading atmospheres.
- Save sentence bookmarks, margin notes, reading progress, and settings in local browser storage.
- Use responsive layouts on desktop, tablet, and mobile.
- Try the full reader with a built-in sample before importing a book.

Files are processed in the browser. Bookflow does not upload book contents to an API or require an account. Scanned/image-only PDFs do not contain selectable text and must be OCR-processed before Bookflow can read them.

## Lightweight tools used

| Tool | Purpose |
| --- | --- |
| React | Component state and accessible reader interactions |
| Vite | Fast local development and optimized static builds |
| PDF.js (`pdfjs-dist`) | Local PDF text extraction |
| JSZip | Local EPUB package and chapter extraction |
| Lucide React | Small, consistent interface icons |
| `Intl.Segmenter` | Native sentence boundaries with a regex fallback |
| Vitest + ESLint | Text-helper tests and code-quality checks |

PDF.js and JSZip are loaded as separate chunks only when their file type is opened, keeping the initial experience lighter.

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create and inspect a production build:

```bash
npm run build
npm run preview
```

## Verify

```bash
npm run lint
npm run test
npm run build
```

The Vite build uses relative asset paths, so the generated `dist/` folder can be hosted from a repository subpath or any static host.

## Privacy and storage

- Imported file contents remain in the active browser session.
- Notes, sentence bookmarks, progress, and appearance preferences use `localStorage` on the same device.
- No AI service, analytics service, backend, or account system is connected.
- Opening the same local file again restores its saved progress from its name, size, and last-modified metadata.
