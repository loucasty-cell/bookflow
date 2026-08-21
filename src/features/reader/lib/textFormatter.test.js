import { describe, expect, it } from "vitest";
import { formatParagraphText, getFixationLength } from "./textFormatter.js";

describe("textFormatter", () => {
  it("computes fixation lengths based on word length", () => {
    expect(getFixationLength(0)).toBe(0);
    expect(getFixationLength(1)).toBe(1);
    expect(getFixationLength(2)).toBe(1);
    expect(getFixationLength(4)).toBe(2);
    expect(getFixationLength(7)).toBe(3);
    expect(getFixationLength(12)).toBe(6);
  });

  it("returns raw text when bionic is disabled", () => {
    const raw = "The quick brown fox.";
    expect(formatParagraphText(raw, { bionic: false })).toBe(raw);
    expect(formatParagraphText("", { bionic: true })).toBe("");
  });

  it("formats words into fixation spans when bionic is enabled", () => {
    const text = "Reading deeply.";
    const result = formatParagraphText(text, { bionic: true });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(1);
  });
});
