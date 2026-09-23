import { describe, expect, it } from 'vitest';
import {
  LONG_BOOK_PARAGRAPH_THRESHOLD,
  countParagraphs,
  estimateChapterHeight,
  findChapterForParagraph,
  initialWindow,
} from './useChapterWindow.js';

function makeChapters(count, perChapter) {
  return Array.from({ length: count }, (_, chapterIndex) => ({
    title: `Chapter ${chapterIndex}`,
    paragraphs: Array.from({ length: perChapter }, (_, paragraphIndex) => ({
      id: `paragraph-${chapterIndex}-${paragraphIndex}`,
      text: 'Some readable paragraph text for measurement.',
    })),
  }));
}

describe('useChapterWindow helpers', () => {
  it('counts paragraphs across chapters', () => {
    expect(countParagraphs(makeChapters(400, 40))).toBe(16000);
    expect(countParagraphs([])).toBe(0);
    expect(countParagraphs(null)).toBe(0);
  });

  it('treats books above the threshold as long', () => {
    expect(countParagraphs(makeChapters(400, 40))).toBeGreaterThan(LONG_BOOK_PARAGRAPH_THRESHOLD);
    expect(countParagraphs(makeChapters(3, 10))).toBeLessThan(LONG_BOOK_PARAGRAPH_THRESHOLD);
  });

  it('finds the chapter owning a paragraph id', () => {
    const chapters = makeChapters(5, 4);
    expect(findChapterForParagraph(chapters, 'paragraph-3-2')).toBe(3);
    expect(findChapterForParagraph(chapters, 'missing')).toBe(-1);
    expect(findChapterForParagraph([], 'paragraph-0-0')).toBe(-1);
  });

  it('centers the initial window on the restored paragraph', () => {
    const chapters = makeChapters(400, 2);
    expect(initialWindow(chapters, 0, 'paragraph-100-1')).toEqual({ start: 99, end: 101 });
  });

  it('clamps the initial window at the book edges', () => {
    const chapters = makeChapters(400, 2);
    expect(initialWindow(chapters, 0, null)).toEqual({ start: 0, end: 1 });
    expect(initialWindow(chapters, 399, null)).toEqual({ start: 398, end: 399 });
    expect(initialWindow([], 0, null)).toEqual({ start: 0, end: -1 });
  });

  it('estimates chapter heights from paragraph counts', () => {
    const chapters = makeChapters(2, 10);
    expect(estimateChapterHeight(chapters[0])).toBeGreaterThan(estimateChapterHeight({ paragraphs: [] }));
    expect(estimateChapterHeight(null)).toBeGreaterThan(0);
  });
});
