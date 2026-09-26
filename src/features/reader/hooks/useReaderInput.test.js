import { describe, expect, it } from "vitest";
import { shouldClaimReaderFocus } from "./useReaderInput.js";

describe("shouldClaimReaderFocus", () => {
  const reader = { focus: () => {} };
  const body = {};
  const button = {};

  it("claims focus when the reader has just mounted and nothing is focused", () => {
    expect(
      shouldClaimReaderFocus({ reader, activeElement: body, body, alreadyClaimed: false }),
    ).toBe(true);
  });

  it("never steals focus from a real control", () => {
    expect(
      shouldClaimReaderFocus({ reader, activeElement: button, body, alreadyClaimed: false }),
    ).toBe(false);
  });

  it("claims focus only once, however often the effect re-runs", () => {
    expect(
      shouldClaimReaderFocus({ reader, activeElement: body, body, alreadyClaimed: true }),
    ).toBe(false);
  });

  it("waits for the canvas to exist", () => {
    expect(
      shouldClaimReaderFocus({ reader: null, activeElement: body, body, alreadyClaimed: false }),
    ).toBe(false);
  });

  it("does nothing without a document body to compare against", () => {
    expect(
      shouldClaimReaderFocus({ reader, activeElement: null, body: null, alreadyClaimed: false }),
    ).toBe(false);
  });
});
