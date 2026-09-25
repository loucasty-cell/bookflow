import { wordCount } from "../../../shared/lib/text.js";
import { isFocusEligibleChapter } from "./focusEligibility.js";

export function enrichChapters(book) {
  if (!book) return [];

  const sourceChapters = Array.isArray(book.chapters) ? book.chapters : [];
  const totalParagraphs = sourceChapters.reduce(
    (total, chapter) => total + (Array.isArray(chapter?.paragraphs) ? chapter.paragraphs.length : 0),
    0,
  );
  let globalIndex = 0;

  return sourceChapters.map((chapter, chapterIndex) => {
    const sourceParagraphs = Array.isArray(chapter?.paragraphs) ? chapter.paragraphs : [];
    const flatParagraphs = sourceParagraphs.map((paragraph, paragraphIndex) => {
      const paragraphGlobalIndex = globalIndex;
      globalIndex += 1;
      return {
        id: `paragraph-${chapterIndex}-${paragraphIndex}`,
        text: paragraph,
        chapterIndex,
        paragraphIndex,
        globalIndex: paragraphGlobalIndex,
        totalParagraphs,
      };
    });
    const rawSections = chapter?.subheadings?.length
      ? chapter.subheadings
      : [{ title: null, paragraphs: sourceParagraphs }];
    let paragraphOffset = 0;
    const sections = rawSections.map((section) => {
      const declared = Array.isArray(section?.paragraphs) ? section.paragraphs : [];
      const enrichedParagraphs = declared
        .map(() => {
          const paragraph = flatParagraphs[paragraphOffset];
          paragraphOffset += 1;
          return paragraph;
        })
        .filter(Boolean);
      return { ...section, paragraphs: enrichedParagraphs };
    });

    return {
      ...chapter,
      totalParagraphs,
      focusEligible: isFocusEligibleChapter(chapter, chapterIndex, sourceChapters.length),
      paragraphs: flatParagraphs,
      sections,
    };
  });
}

export function countBookWords(book) {
  return (
    book?.chapters.reduce(
      (total, chapter) => total + wordCount(chapter.paragraphs.join(" ")),
      0
    ) ?? 0
  );
}

export function readingMinutes(totalWords) {
  return Math.max(1, Math.ceil(totalWords / 230));
}
