import { describe, expect, it } from "vitest";
import {
  isSalientToken,
  getSalientFixationLength,
  formatSalientParagraphText,
} from "./salienceFormatter.js";

describe("salienceFormatter", () => {
  it("correctly identifies salient vs functional words", () => {
    expect(isSalientToken("the")).toBe(false);
    expect(isSalientToken("and")).toBe(false);
    expect(isSalientToken("in")).toBe(false);
    expect(isSalientToken("of")).toBe(false);
    expect(isSalientToken("architecture")).toBe(true);
    expect(isSalientToken("reading")).toBe(true);
    expect(isSalientToken("curiosity")).toBe(true);
  });

  it("calculates salient fixation lengths accurately", () => {
    // Stop words
    expect(getSalientFixationLength("the")).toBe(0);
    expect(getSalientFixationLength("in")).toBe(0);
    expect(getSalientFixationLength("with")).toBe(1);

    // Salient words
    expect(getSalientFixationLength("memory")).toBe(3);
    expect(getSalientFixationLength("attention")).toBe(5);
  });

  it("formats paragraph text with salient anchor spans", () => {
    const output = formatSalientParagraphText("The architecture of human curiosity is deep.");
    expect(Array.isArray(output)).toBe(true);
    expect(output.length).toBeGreaterThan(1);
  });
});
