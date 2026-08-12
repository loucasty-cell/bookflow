# Bookflow

Bookflow is a private, browser-based reading space for PDFs, EPUB ebooks, text files, and Markdown. It follows the small paragraph nearest a quiet upper-page focus rail as the reader scrolls, helping long reading sessions feel calmer and easier to continue.

![Bookflow paragraph-focused reader](https://img.shields.io/badge/reader-local--first-507B9C) ![React](https://img.shields.io/badge/React-18-61dafb) ![Vite](https://img.shields.io/badge/Vite-6-646cff)

## What works

- Import `.pdf`, `.epub`, `.txt`, `.md`, and `.markdown` files up to 50 MB.
- Verify PDF and EPUB signatures and reject empty, binary, spoofed, or unreadable text files before opening.
- Show a clear local import status through a visible 100% ready state before entering the reader.
- Extract selectable PDF text locally with PDF.js and recover image-only English pages with local OCR.
- Read EPUB chapters locally with JSZip and the ebook's package/spine metadata.
- Group Markdown chapters and EPUB chapter content into one subheading level while keeping deeper headings as readable text.
- Focus Reading Mode keeps a fixed reading rail near 42% of the viewport and moves the book one small whole paragraph at a time behind it.
- Wheel, touch, keyboard, and the Previous/Next controls share one scroll-intent controller with speed limiting, controlled acceleration, paragraph skim steps, and snap-after-scroll behavior.
- Normal Reading Mode keeps native continuous scrolling and a quiet current-paragraph highlight.
- Skip likely front matter, introductions, and end matter when choosing the automatic focus paragraph.
- Free-scroll introductions and other static sections natively in Focus Reading Mode; focus resumes when the rail returns to eligible body text.
- Click or press Enter on a real-context paragraph to hold it in focus, then resume the natural flow.
- Navigate long PDFs with a compact current-page/total-pages control such as `8 / 283`.
- Choose Focus or Normal Reading Mode, soft/deep/disabled focus, font size, line spacing, page width, and paragraph cooldown.
- Use a content-first, Apple-inspired interface with precise spacing, glass materials, safe-area support, and 44px mobile controls.
- Keep the soft-white `#507B9C`, `#C2DCFF`, and `#E3242B` palette in light mode, or switch to a near-black reading atmosphere with restrained blue and wine accents.
- Save paragraph bookmarks, margin notes, reading progress, and settings in local browser storage.
- Use responsive layouts on desktop, tablet, and mobile.
- Try the full reader with a built-in sample before importing a book.

In Focus Reading Mode, use Arrow Down / J for the next paragraph, Arrow Up / K for the previous paragraph, Space for the next paragraph, Shift + Space for the previous paragraph, Page Down / Page Up for small groups, and Escape to pause the focus controller. Click or press Enter on a real-context paragraph to hold it, then use Resume flow to continue. Introductions and front/end matter remain visible as normal book pages, scroll natively, and are not selectable focus targets.

Files are processed in the browser. Bookflow does not upload book contents to an API or require an account. For scanned or image-only PDF pages, Bookflow renders each page locally and uses its bundled English OCR model while preserving the PDF's original page order. OCR accuracy depends on scan clarity, orientation, typography, and language; unclear or non-English scans may need a better source file.

## Lightweight tools used

| Tool | Purpose |
| --- | --- |
| React | Component state and accessible reader interactions |
| Vite | Fast local development and optimized static builds |
| PDF.js (`pdfjs-dist`) | Local PDF text extraction |
| Tesseract.js | Private browser OCR for image-only English PDF pages |
| JSZip | Local EPUB package and chapter extraction |
| Lucide React | Small, consistent interface icons |
| `Intl.Segmenter` | Native sentence boundaries with a regex fallback |
| Vitest + ESLint | Text-helper tests and code-quality checks |

PDF.js, JSZip, and Tesseract.js are loaded only when their file type or OCR fallback is needed, keeping the initial experience lighter. OCR worker, WebAssembly, and English language assets are bundled with the production build rather than fetched from a third-party service.

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
- Re-parsing a changed Markdown or EPUB structure can shift paragraph IDs, so older notes or bookmarks for that file may no longer match a paragraph.
