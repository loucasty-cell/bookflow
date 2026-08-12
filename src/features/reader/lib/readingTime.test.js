import { describe, expect, it } from "vitest";
import { formatReadingTime } from "./readingTime.js";

describe("reading time formatting", () => {
  it("keeps short estimates compact", () => {
    expect(formatReadingTime(1)).toBe("1 min");
    expect(formatReadingTime(42)).toBe("42 min");
  });

  it("scales long estimates into hours", () => {
    expect(formatReadingTime(60)).toBe("1 hr");
    expect(formatReadingTime(145)).toBe("2 hr 25 min");
  });
});
