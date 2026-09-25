import { describe, expect, it } from "vitest";
import { countBookWords, enrichChapters, readingMinutes } from "./chapterEnrichment.js";
import { readingProgress } from "./readingController.js";

describe("chapter enrichment", () => {
  it("creates stable paragraph IDs for flat paragraphs and subsections", () => {
    const book = {
      chapters: [
        {
          title: "Chapter One",
          paragraphs: ["First paragraph.", "Second paragraph.", "Third paragraph."],
          subheadings: [
            { title: null, paragraphs: ["First paragraph."] },
            {
              title: "Details",
              paragraphs: ["Second paragraph.", "Third paragraph."],
            },
          ],
        },
        { title: "References", paragraphs: ["End matter."] },
      ],
    };

    const chapters = enrichChapters(book);

    expect(chapters[0].paragraphs).toEqual([
      {
        id: "paragraph-0-0",
        text: "First paragraph.",
        chapterIndex: 0,
        paragraphIndex: 0,
        globalIndex: 0,
        totalParagraphs: 4,
      },
      {
        id: "paragraph-0-1",
        text: "Second paragraph.",
        chapterIndex: 0,
        paragraphIndex: 1,
        globalIndex: 1,
        totalParagraphs: 4,
      },
      {
        id: "paragraph-0-2",
        text: "Third paragraph.",
        chapterIndex: 0,
        paragraphIndex: 2,
        globalIndex: 2,
        totalParagraphs: 4,
      },
    ]);
    expect(chapters[0].sections[0].paragraphs[0]).toEqual(chapters[0].paragraphs[0]);
    expect(chapters[0].sections[1].paragraphs[1]).toEqual(chapters[0].paragraphs[2]);
    expect(chapters[1].paragraphs[0].globalIndex).toBe(3);
    expect(chapters[1].paragraphs[0].totalParagraphs).toBe(4);
    expect(
      readingProgress(chapters[1].paragraphs[0].globalIndex, chapters[1].paragraphs[0].totalParagraphs),
    ).toBe(100);
    expect(chapters[1].focusEligible).toBe(false);
  });

  it("uses whole-book paragraph positions for windowed progress", () => {
    const book = {
      chapters: [
        { paragraphs: ["one", "two"] },
        { paragraphs: ["three", "four", "five"] },
        { paragraphs: ["six", "seven"] },
      ],
    };

    const chapters = enrichChapters(book);
    const middleParagraph = chapters[1].paragraphs[1];

    expect(middleParagraph.globalIndex).toBe(3);
    expect(middleParagraph.totalParagraphs).toBe(7);
    expect(
      readingProgress(middleParagraph.globalIndex, middleParagraph.totalParagraphs),
    ).toBe(50);
  });

  it("counts words from chapter paragraph text", () => {
    const book = {
      totalWords: 999,
      chapters: [{ paragraphs: ["one two", "three four five"] }],
    };

    expect(countBookWords(book)).toBe(5);
  });

  it("estimates minutes at 230 words per minute with a one-minute minimum", () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(230)).toBe(1);
    expect(readingMinutes(460)).toBe(2);
    expect(readingMinutes(461)).toBe(3);
  });
});
