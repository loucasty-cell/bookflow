import { normalizeText, splitParagraphs } from "../../../shared/lib/text.js";
import { cleanTitle } from "./textParser.js";
import { mark } from "../../../shared/lib/perfMarks.js";
import {
  parseXml,
  xmlElements,
  resolveArchivePath,
  collectContentBlocks,
  buildEpubSections,
  chapterFromSections,
} from "./epubUtils.js";

const MAX_ARCHIVE_ENTRIES = 3000;
const MAX_ENTRY_BYTES = 20 * 1024 * 1024;

export async function parseEpub(file, onProgress) {
  const { default: JSZip } = await import("jszip");
  let zip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new Error("This EPUB is damaged or cannot be opened.");
  }

  const archiveEntries = Object.values(zip.files);
  if (archiveEntries.length > MAX_ARCHIVE_ENTRIES) {
    throw new Error("This EPUB contains too many files to open safely.");
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
    const entry = zip.file(path);
    if (!entry || (typeof entry._data?.uncompressedSize === "number" && entry._data.uncompressedSize > MAX_ENTRY_BYTES)) continue;
    const source = await entry.async("text");
    if (!source || source.length > MAX_ENTRY_BYTES) continue;

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
    if (chapter.paragraphs.length || chapter.subheadings?.length) {
      chapters.push(chapter);
    } else {
      const rawParagraphs = splitParagraphs(normalizeText(body.textContent));
      chapters.push({
        title: fallbackTitle || `Chapter ${chapters.length + 1}`,
        paragraphs: rawParagraphs.length ? rawParagraphs : ["This chapter has no readable text."],
        subheadings: [],
      });
    }
    onProgress?.(
      Math.round(((index + 1) / spine.length) * 100),
      `Opening chapter ${index + 1} of ${spine.length}`,
    );
  }

  if (!chapters.length)
    throw new Error("No readable chapters were found in this EPUB.");
  mark("chapters-done");
  return { title, author, kind: "EPUB", chapters };
}
