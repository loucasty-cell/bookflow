import { describe, expect, it } from "vitest";
import {
  accumulateScrollIntent,
  estimateReadingMs,
  getIntentDirection,
  getNavigationStep,
  readingProgress,
} from "./readingController.js";

describe("reading controller primitives", () => {
  it("limits large wheel input and resets intent when direction changes", () => {
    expect(accumulateScrollIntent(0, 200)).toBe(64);
    expect(accumulateScrollIntent(64, 40)).toBe(104);
    expect(accumulateScrollIntent(104, -20)).toBe(-20);
  });

  it("only emits a direction after the intent threshold is reached", () => {
    expect(getIntentDirection(95)).toBe(0);
    expect(getIntentDirection(96)).toBe(1);
    expect(getIntentDirection(-96)).toBe(-1);
  });

  it("always advances one paragraph at a time when moving with intent", () => {
    expect(getNavigationStep({ burstCount: 1, delta: 20 })).toBe(1);
    expect(getNavigationStep({ burstCount: 5, delta: 60 })).toBe(1);
    expect(getNavigationStep({ burstCount: 12, delta: 120 })).toBe(1);
  });

  it("calculates semantic progress and a bounded reading estimate", () => {
    expect(readingProgress(4, 9)).toBe(50);
    expect(estimateReadingMs("A short sentence.")).toBeGreaterThanOrEqual(900);
    expect(estimateReadingMs("A short sentence.")).toBeLessThanOrEqual(8000);
  });
});
