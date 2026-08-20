import { classifyParagraph, formatClassification } from "../../../shared/lib/text.js";
import {
  normalizeText,
  splitParagraphs,
  stripMarkdown,
} from "../../../shared/lib/text.js";
import {
  ACCEPTED_FILES,
  extensionOf,
  validateBookFile,
} from "./fileValidation.js";
import {
  createPdfOcrWorker,
  pageNeedsOcr,
  pdfPageProgress,
  recognizePdfPage,
} from "./pdfOcr.js";

function cleanTitle(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function xmlElements(root, localName) {
  return [...root.getElementsByTagName("*")].filter(
    (element) => element.localName === localName,
  );
}

function resolveArchivePath(baseFile, relativePath) {
  const base = baseFile.includes("/")
    ? baseFile.slice(0, baseFile.lastIndexOf("/") + 1)
    : "";
  const stack = `${base}${decodeURIComponent(relativePath)}`.split("/");
  const result = [];
  for (const part of stack) {
    if (!part || part === ".") continue;
    if (part === "..") result.pop();
    else result.push(part);
  }
  return result.join("/");
}

function collectContentBlocks(element) {
  element
    .querySelectorAll("script, style, nav, svg, noscript")
    .forEach((node) => node.remove());
  const candidates = [
    ...element.querySelectorAll("h1, h2, h3, h4, h5, h6, p, blockquote, li"),
  ];
  const blocks = [];
  for (const node of candidates) {
    if (
      node.querySelector("h1, h2, h3, h4, h5, h6, p, blockquote, li")
    )
      continue;
    const text = normalizeText(node.textContent);
    const tag = node.tagName.toLowerCase();
    if (tag === "p" || tag === "blockquote" || tag === "li") {
      if (text.length > 20) blocks.push({ type: "content", text });
    } else if (text.length > 0) {
      blocks.push({ type: "heading", level: Number(tag[1]), text });
    }
  }
  return blocks;
}

export function buildEpubSections(blocks) {
  const titleIndex = blocks.findIndex((block) => block.type === "heading");
  const sections = [];
  let current = null;
  let inlineHeadingText = [];
  const title = titleIndex >= 0 ? blocks[titleIndex].text : "";

  const ensureLeading = () => {
    if (!current) {
      current = { title: null, paragraphs: [] };
      sections.push(current);
    }
  };

  const appendInlineHeadingText = () => {
    if (!inlineHeadingText.length) return;
    ensureLeading();
    const inlineText = inlineHeadingText.join(" ");
    if (current.paragraphs.length) {
      const lastIndex = current.paragraphs.length - 1;
      current.paragraphs[lastIndex] = `${current.paragraphs[lastIndex]} ${inlineText}`;
    } else {
      current.paragraphs.push(inlineText);
    }
    inlineHeadingText = [];
  };

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (
      block.type === "heading" &&
      index !== titleIndex &&
      [2, 3].includes(block.level)
    ) {
      appendInlineHeadingText();
      current = { title: block.text, paragraphs: [] };
      sections.push(current);
    } else if (block.type === "heading" && index !== titleIndex) {
      inlineHeadingText.push(block.text);
    } else if (index !== titleIndex) {
      ensureLeading();
      current.paragraphs.push(
        [...inlineHeadingText, block.text].join(" "),
      );
      inlineHeadingText = [];
    } else {
      ensureLeading();
    }
  }
  appendInlineHeadingText();
  return { title, sections };
}

function chapterFromSections(title, sections) {
  const populated = sections.filter((section) => section.paragraphs.length);
  const paragraphs = populated.flatMap((section) => section.paragraphs);
  const subheadings = populated.map((section) => ({
    title: section.title,
    paragraphs: section.paragraphs,
  }));
  return {
    title,
    paragraphs,
    ...(subheadings.some((section) => section.title)
      ? { subheadings }
      : {}),
  };
}

function markdownHeadingText(value) {
  return stripMarkdown(value.replace(/\s+#+\s*$/, "")).trim();
}

function markdownHeadingBlocks(source) {
  return [...source.matchAll(/^ {0,3}(#{1,6})[ \t]+(.+?)\s*$/gm)].map(
    (match) => ({
      level: match[1].length,
      title: markdownHeadingText(match[2]),
      index: match.index,
      end: match.index + match[0].length,
    }),
  );
}

function markdownContent(source, inlineHeadingLevel) {
  let prepared = source;
  if (inlineHeadingLevel <= 6) {
    const headingPattern = new RegExp(
      `^ {0,3}#{${inlineHeadingLevel},}[ \\t]+(.+?)(?:[ \\t]+#+)?[ \\t]*(?:\\r?\\n|$)(?:[ \\t]*\\r?\\n)*`,
      "gm",
    );
    prepared = source.replace(
      headingPattern,
      (_, text) => `${markdownHeadingText(text)} `,
    );
  }
  return splitParagraphs(stripMarkdown(prepared));
}

function nextLineStart(source, index) {
  if (source.startsWith("\r\n", index)) return index + 2;
  if (source[index] === "\r" || source[index] === "\n") return index + 1;
  return index;
}

export function buildMarkdownChapters(source) {
  const headings = markdownHeadingBlocks(source);
  if (!headings.length) return null;

  const chapterLevel = Math.min(...headings.map((heading) => heading.level));
  const chapterHeadings = headings.filter(
    (heading) => heading.level === chapterLevel,
  );
  const leading = source.slice(0, chapterHeadings[0].index);

  return chapterHeadings
    .map((heading, index) => {
      const chapterEnd =
        chapterHeadings[index + 1]?.index ?? source.length;
      const bodyStart = nextLineStart(source, heading.end);
      const body = source.slice(bodyStart, chapterEnd);
      const bodyHeadings = headings.filter(
        (candidate) =>
          candidate.index >= bodyStart && candidate.index < chapterEnd,
      );
      const subheadingHeadings = bodyHeadings.filter(
        (candidate) => candidate.level === chapterLevel + 1,
      );
      const chapterPrefix = index === 0 ? leading : "";

      if (!subheadingHeadings.length) {
        return {
          title: heading.title,
          paragraphs: markdownContent(
            `${chapterPrefix}${body}`,
            chapterLevel + 2,
          ),
        };
      }

      const sections = [];
      const firstSubheading = subheadingHeadings[0];
      const leadingSectionParagraphs = markdownContent(
        `${chapterPrefix}${source.slice(bodyStart, firstSubheading.index)}`,
        chapterLevel + 2,
      );
      if (leadingSectionParagraphs.length)
        sections.push({ title: null, paragraphs: leadingSectionParagraphs });

      subheadingHeadings.forEach((subheading, subheadingIndex) => {
        const sectionEnd =
          subheadingHeadings[subheadingIndex + 1]?.index ?? chapterEnd;
        const sectionStart = nextLineStart(source, subheading.end);
        sections.push({
          title: subheading.title,
          paragraphs: markdownContent(
            source.slice(sectionStart, sectionEnd),
            chapterLevel + 2,
          ),
        });
      });

      const populatedSections = sections.filter(
        (section) => section.paragraphs.length,
      );
      const paragraphs = populatedSections.flatMap(
        (section) => section.paragraphs,
      );
      return {
        title: heading.title,
        paragraphs,
        subheadings: populatedSections.map((section) => ({
          title: section.title,
          paragraphs: section.paragraphs,
        })),
      };
    })
    .filter(
      (chapter) =>
        chapter.paragraphs.length || chapter.subheadings?.length,
    );
}

function parseXml(source, type = "application/xml") {
  const document = new DOMParser().parseFromString(source, type);
  if (document.querySelector("parsererror"))
    throw new Error("This ebook contains invalid XML.");
  return document;
}

export async function parsePdf(file, onProgress) {
  const [pdfjs, workerModule] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
  const data = new Uint8Array(await file.arrayBuffer());
  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data }).promise;
  } catch {
    throw new Error("This PDF is encrypted, damaged, or cannot be read.");
  }

  const metadata = await pdf.getMetadata().catch(() => null);
  const chapters = [];
  const documentTitle =
    normalizeText(metadata?.info?.Title) || cleanTitle(file.name);
  let ocrPageCount = 0;
  let lastProgress = 10;

  const reportProgress = (percent, label) => {
    lastProgress = Math.max(lastProgress, Math.min(96, Math.round(percent)));
    onProgress?.(lastProgress, label);
  };

  const pagesToOcr = [];
  const nativeChapters = Array(pdf.numPages).fill(null);

  // 1. Process native text and find pages needing OCR
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    reportProgress(
      pdfPageProgress(pageNumber, pdf.numPages * 2.5, 0),
      `Reading page ${pageNumber} of ${pdf.numPages}`,
    );
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent({ normalizeWhitespace: true });
    const lines = [];
    let currentLine = [];
    let lastY = null;

    for (const item of content.items) {
      const value = item.str?.trim();
      if (!value) continue;
      const y = Math.round(item.transform?.[5] ?? 0);
      if (lastY !== null && Math.abs(y - lastY) > 4 && currentLine.length) {
        lines.push(currentLine.join(" "));
        currentLine = [];
      }
      currentLine.push(value);
      if (item.hasEOL) {
        lines.push(currentLine.join(" "));
        currentLine = [];
      }
      lastY = y;
    }
    if (currentLine.length) lines.push(currentLine.join(" "));

    const readableLines = lines.filter(
      (candidate) =>
        !(pageNumber === 1 && normalizeText(candidate) === documentTitle),
    );
    const nativeText = readableLines.join("\n");
    const requiresOcr = pageNeedsOcr(nativeText);

    if (requiresOcr) {
      pagesToOcr.push({ pageNumber, page, readableLines });
    } else {
      const pageText = readableLines
        .map((line, index) => {
          const next = readableLines[index + 1] || "";
          const headingLike =
            line.length < 90 &&
            !/[.!?…]["'’”)]?$/.test(line) &&
            /^[A-Z\d]/.test(line);
          const paragraphEnd =
            /[.!?…]["'’”)]?$/.test(line) &&
            (!next || /^[A-Z\d“"'’]/.test(next));
          return `${line}${headingLike || paragraphEnd ? "\n\n" : " "}`;
        })
        .join("")
        .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2")
        .replace(/\n(?=\p{Ll})/gu, " ");
      const paragraphs = splitParagraphs(pageText).filter(
        (paragraph) => paragraph.length > 15,
      );

      const pageTitleCandidate = normalizeText(
        paragraphs?.[0] ?? readableLines[0] ?? "",
      );
      const pageTitle =
        pageTitleCandidate &&
        pageTitleCandidate.length <= 62 &&
        !/[.!?…]["'’”)]?$/.test(pageTitleCandidate) &&
        /^[A-Z\d]/.test(pageTitleCandidate)
          ? pageTitleCandidate
          : `Page ${pageNumber}`;

      if (paragraphs?.length) {
        nativeChapters[pageNumber - 1] = { title: pageTitle, paragraphs };
      }
    }
  }

  // 2. Process OCR pages concurrently
  if (pagesToOcr.length > 0) {
    reportProgress(
      pdfPageProgress(pdf.numPages, pdf.numPages * 2.5, 0), // start OCR progress
      "Starting private on-device OCR",
    );

    let scheduler = null;
    let workers = [];
    try {
      const { createScheduler } = await import("tesseract.js");
      scheduler = createScheduler();
      // Limit concurrency to 4 max to avoid OOM
      const concurrency = Math.min(
        pagesToOcr.length,
        Math.min(navigator.hardwareConcurrency || 4, 4)
      );

      let ocrCompleted = 0;
      const totalOcr = pagesToOcr.length;

      // To avoid erratic UI progress jumps caused by interleaving multi-worker progress events,
      // we only increment the main progress bar fully when a whole page's OCR has finished.
      const ocrLogger = () => {};

      try {
        for (let i = 0; i < concurrency; i++) {
          const worker = await createPdfOcrWorker(ocrLogger);
          workers.push(worker);
          scheduler.addWorker(worker);
        }
      } catch {
        throw new Error(
          "Bookflow could not start local OCR in this browser. Check that Web Workers and WebAssembly are enabled, then try again.",
        );
      }

      // Since recognizePdfPage uses Tesseract scheduler, we can simply queue them all.
      // But to prevent allocating hundreds of 10MP canvases into memory concurrently before Tesseract processes them,
      // we process them sequentially here (scheduler will still queue, but canvases won't hold memory).

      const ocrPromises = [];
      const queue = [...pagesToOcr];

      const workerFn = async () => {
        while (queue.length > 0) {
          const { pageNumber, page, readableLines } = queue.shift();
          const recognized = await recognizePdfPage(scheduler, page);
          const paragraphs = recognized.paragraphs;
          if (paragraphs.length) ocrPageCount += 1;

          const pageTitleCandidate = normalizeText(
            paragraphs?.[0] ?? readableLines[0] ?? "",
          );
          const pageTitle =
            pageTitleCandidate &&
            pageTitleCandidate.length <= 62 &&
            !/[.!?…]["'’”)]?$/.test(pageTitleCandidate) &&
            /^[A-Z\d]/.test(pageTitleCandidate)
              ? pageTitleCandidate
              : `Page ${pageNumber}`;

          if (paragraphs?.length) {
            nativeChapters[pageNumber - 1] = { title: pageTitle, paragraphs };
          }
          ocrCompleted++;
          reportProgress(
            pdfPageProgress(pdf.numPages + Math.round((ocrCompleted / totalOcr) * pdf.numPages * 1.5), pdf.numPages * 2.5, 0),
            `Recovering scanned pages (${ocrCompleted} of ${totalOcr} complete)`,
          );
        }
      };

      for (let i = 0; i < concurrency; i++) {
        ocrPromises.push(workerFn());
      }

      await Promise.all(ocrPromises);

    } finally {
      if (scheduler) {
        await scheduler.terminate();
      }
    }
  }

  // 3. Assemble chapters in correct order
  for (const chapter of nativeChapters) {
    if (chapter) chapters.push(chapter);
  }

  if (!chapters.length)
    throw new Error(
      "Local OCR could not find readable English text in this PDF. Try a clearer, upright scan or an OCR-ready copy.",
    );

  return {
    title: documentTitle,
    author: normalizeText(metadata?.info?.Author),
    kind: "PDF",
    chapters,
    ocrPageCount,
  };
}

export async function parseEpub(file, onProgress) {
  const { default: JSZip } = await import("jszip");
  let zip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new Error("This EPUB is damaged or cannot be opened.");
  }

  const containerSource = await zip
    .file("META-INF/container.xml")
    ?.async("text");
  if (!containerSource)
    throw new Error(
      "This archive does not appear to be a valid EPUB book. Its EPUB container manifest is missing.",
    );
  const container = parseXml(containerSource);
  const rootfile = xmlElements(container, "rootfile")[0]?.getAttribute(
    "full-path",
  );
  if (!rootfile)
    throw new Error("This EPUB does not identify its book package.");

  const packageSource = await zip.file(rootfile)?.async("text");
  if (!packageSource) throw new Error("This EPUB package could not be read.");
  const packageDoc = parseXml(packageSource);
  const manifest = new Map(
    xmlElements(packageDoc, "item").map((item) => [
      item.getAttribute("id"),
      item.getAttribute("href"),
    ]),
  );
  const spine = xmlElements(packageDoc, "itemref")
    .map((item) => item.getAttribute("idref"))
    .filter(Boolean);
  const metadata = xmlElements(packageDoc, "metadata")[0];
  const title =
    normalizeText(
      xmlElements(metadata ?? packageDoc, "title")[0]?.textContent,
    ) || cleanTitle(file.name);
  const author = normalizeText(
    xmlElements(metadata ?? packageDoc, "creator")[0]?.textContent,
  );
  const chapters = [];

  for (let index = 0; index < spine.length; index += 1) {
    const href = manifest.get(spine[index]);
    if (!href) continue;
    const path = resolveArchivePath(rootfile, href.split("#")[0]);
    const source = await zip.file(path)?.async("text");
    if (!source) continue;

    const chapterDoc = parseXml(source, "application/xhtml+xml");
    const body = chapterDoc.body ?? chapterDoc.documentElement;
    const blocks = collectContentBlocks(body);
    if (
      !blocks.some((block) => block.type === "content") &&
      !blocks.some((block) => block.type === "heading")
    ) {
      blocks.push(
        ...splitParagraphs(body.textContent).map((text) => ({
          type: "content",
          text,
        })),
      );
    }
    const structured = buildEpubSections(blocks);
    const fallbackTitle = normalizeText(
      chapterDoc.querySelector("title")?.textContent,
    );
    const chapter = chapterFromSections(
      structured.title || fallbackTitle || `Chapter ${chapters.length + 1}`,
      structured.sections,
    );
    if (chapter.paragraphs.length || chapter.subheadings?.length)
      chapters.push(chapter);
    onProgress?.(
      Math.round(((index + 1) / spine.length) * 100),
      `Opening chapter ${index + 1} of ${spine.length}`,
    );
  }

  if (!chapters.length)
    throw new Error("No readable chapters were found in this EPUB.");
  return { title, author, kind: "EPUB", chapters };
}

function parseTextDocument(file, source) {
  const isMarkdown = ["md", "markdown"].includes(extensionOf(file.name));
  const raw = isMarkdown ? stripMarkdown(source) : source;
  const normalized = normalizeText(raw);

  let chapters;
  const markdownChapters = isMarkdown ? buildMarkdownChapters(source) : null;
  if (markdownChapters) {
    chapters = markdownChapters;
  } else {
    const paragraphs = splitParagraphs(normalized);
    chapters = [];
    for (let index = 0; index < paragraphs.length; index += 10) {
      chapters.push({
        title: `Section ${chapters.length + 1}`,
        paragraphs: paragraphs.slice(index, index + 10),
      });
    }
  }

  return {
    title: cleanTitle(file.name),
    author: "",
    kind: isMarkdown ? "MARKDOWN" : "TEXT",
    chapters,
  };
}

export async function parseDocument(file, onProgress) {
  onProgress?.(10, "Verifying this book file");
  const extension = await validateBookFile(file);

  if (extension === "pdf") return parsePdf(file, onProgress);
  if (extension === "epub") return parseEpub(file, onProgress);

  onProgress?.(45, "Reading your document");
  const source = await file.text();
  const result = parseTextDocument(file, source);
  if (!result.chapters.length)
    throw new Error("No readable text was found in this document.");
  onProgress?.(100, "Preparing your reading flow");
  // Apply paragraph classification and logging output format
  let paragraphIndex = 1;
  let formattedOutput = "\n--- CLASSIFICATION OUTPUT ---\n";

  result.chapters.forEach(chapter => {
    if (chapter.paragraphs) {
       chapter.classifications = chapter.paragraphs.map(p => {
          const textContent = typeof p === 'string' ? p : p.text || '';
          const classification = classifyParagraph(textContent);
          formattedOutput += formatClassification(paragraphIndex++, textContent, classification) + "\n\n";
          return classification;
       });
    }
    if (chapter.subheadings) {
       chapter.subheadings.forEach(sub => {
          if (sub.paragraphs) {
             sub.classifications = sub.paragraphs.map(p => {
                const textContent = typeof p === 'string' ? p : p.text || '';
                const classification = classifyParagraph(textContent);
                formattedOutput += formatClassification(paragraphIndex++, textContent, classification) + "\n\n";
                return classification;
             });
          }
       });
    }
  });

  // Output logs to console based on user instructions to match output format
  console.log(formattedOutput);

  return result;
}

export { ACCEPTED_FILES };
