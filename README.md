# Bookflow

Bookflow is a private, browser-based reading space for PDFs, EPUB ebooks, text files, and Markdown. It follows the small paragraph nearest a quiet upper-page focus rail as the reader scrolls, helping long reading sessions feel calmer and easier to continue.

![Bookflow paragraph-focused reader](https://img.shields.io/badge/reader-local--first-507B9C) ![React](https://img.shields.io/badge/React-18-61dafb) ![Vite](https://img.shields.io/badge/Vite-6-646cff)

## What works

- Import `.pdf`, `.epub`, `.txt`, `.md`, and `.markdown` files up to 50 MB.
- Verify PDF and EPUB signatures and reject empty, binary, spoofed, or unreadable text files before opening.
- Show a clear local import status through a visible 100% ready state before entering the reader.
- Extract selectable PDF text locally with PDF.js.
- Read EPUB chapters locally with JSZip and the ebook's package/spine metadata.
- Focus Reading Mode keeps a fixed reading rail near 42% of the viewport and moves the book one small whole paragraph at a time behind it.
- Wheel, touch, keyboard, and the Previous/Next controls share one scroll-intent controller with speed limiting, controlled acceleration, paragraph skim steps, and snap-after-scroll behavior.
- Normal Reading Mode keeps native continuous scrolling and a quiet current-paragraph highlight.
- Skip likely front matter, introductions, and end matter when choosing the automatic focus paragraph.
- Click or press Enter on a real-context paragraph to hold it in focus, then resume the natural flow.
- Navigate long PDFs with a compact current-page/total-pages control such as `8 / 283`.
- Choose Focus or Normal Reading Mode, soft/deep/disabled focus, font size, line spacing, page width, and paragraph cooldown.
- Use a soft-white reading surface with `#507B9C`, `#C2DCFF`, and `#E3242B` interaction accents.
- Switch between warm paper and dusk reading atmospheres.
- Save paragraph bookmarks, margin notes, reading progress, and settings in local browser storage.
- Use responsive layouts on desktop, tablet, and mobile.
- Try the full reader with a built-in sample before importing a book.

In Focus Reading Mode, use Arrow Down / J for the next paragraph, Arrow Up / K for the previous paragraph, Space for the next paragraph, Shift + Space for the previous paragraph, Page Down / Page Up for small groups, and Escape to pause the focus controller. Click or press Enter on a real-context paragraph to hold it, then use Resume flow to continue. Introductions and front/end matter remain visible as normal book pages, but they are not selectable focus targets.

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
- Notes, paragraph bookmarks, progress, and appearance preferences use `localStorage` on the same device.
- No AI service, analytics service, backend, or account system is connected.
- Opening the same local file again restores its saved progress from its name, size, and last-modified metadata.
