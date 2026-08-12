import { describe, expect, it } from "vitest";
import {
  buildEpubSections,
  buildMarkdownChapters,
} from "./documentParsers.js";

describe("Markdown structure parsing", () => {
  it("uses the minimum heading level for chapters and the next level for subheadings", () => {
    const chapters = buildMarkdownChapters(
      [
        "A short introduction before the first heading.",
        "",
        "## First chapter",
        "",
        "The opening paragraph.",
        "",
        "### First idea",
        "",
        "The first idea paragraph.",
        "",
        "#### Detail that stays inline",
        "",
        "The detail paragraph.",
        "",
        "### Second idea",
        "",
        "The second idea paragraph.",
      ].join("\n"),
    );

    expect(chapters).toHaveLength(1);
    expect(chapters[0].title).toBe("First chapter");
    expect(chapters[0].paragraphs).toEqual([
      "A short introduction before the first heading.",
      "The opening paragraph.",
      "The first idea paragraph.",
      "Detail that stays inline The detail paragraph.",
      "The second idea paragraph.",
    ]);
    expect(chapters[0].subheadings).toEqual([
      {
        title: null,
        paragraphs: [
          "A short introduction before the first heading.",
          "The opening paragraph.",
        ],
      },
      {
        title: "First idea",
        paragraphs: [
          "The first idea paragraph.",
          "Detail that stays inline The detail paragraph.",
        ],
      },
      { title: "Second idea", paragraphs: ["The second idea paragraph."] },
    ]);
  });
});

describe("EPUB block grouping", () => {
  it("keeps the spine title separate and groups only h2 and h3 blocks", () => {
    const result = buildEpubSections([
      { type: "content", text: "Leading content." },
      { type: "heading", level: 1, text: "Chapter title" },
      { type: "content", text: "Chapter opening." },
      { type: "heading", level: 2, text: "First subheading" },
      { type: "content", text: "First group." },
      { type: "heading", level: 3, text: "Second subheading" },
      { type: "content", text: "Second group." },
      { type: "heading", level: 4, text: "Inline detail" },
      { type: "content", text: "Detail group." },
    ]);

    expect(result).toEqual({
      title: "Chapter title",
      sections: [
        {
          title: null,
          paragraphs: ["Leading content.", "Chapter opening."],
        },
        { title: "First subheading", paragraphs: ["First group."] },
        {
          title: "Second subheading",
          paragraphs: ["Second group.", "Inline detail Detail group."],
        },
      ],
    });
  });
});
