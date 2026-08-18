import {
  normalizeText,
  splitParagraphs,
  stripMarkdown,
} from "../../../shared/lib/text.js";
import { extensionOf } from "./fileValidation.js";

export function cleanTitle(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

export function parseTextDocument(file, source) {
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
