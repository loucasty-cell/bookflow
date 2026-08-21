import { describe, expect, it } from "vitest";
import { computeScrollMetrics } from "./useScrollPosition.js";

describe("computeScrollMetrics", () => {
  it("calculates progress at top", () => {
    const metrics = computeScrollMetrics(0, 800, 2400);
    expect(metrics.progress).toBe(0);
    expect(metrics.scrollTop).toBe(0);
    expect(metrics.maxScroll).toBe(1600);
  });

  it("calculates progress at 50%", () => {
    const metrics = computeScrollMetrics(800, 800, 2400);
    expect(metrics.progress).toBe(50);
  });

  it("calculates progress at 100% bottom", () => {
    const metrics = computeScrollMetrics(1600, 800, 2400);
    expect(metrics.progress).toBe(100);
  });

  it("handles zero or negative dimensions safely", () => {
    const metrics = computeScrollMetrics(-50, 0, 0);
    expect(metrics.progress).toBe(0);
    expect(metrics.scrollTop).toBe(0);
    expect(metrics.maxScroll).toBe(0);
  });
});
