import { afterEach, describe, expect, it, vi } from "vitest";
import { sectionAtFocusRail, staticRegionName } from "./staticRegion.js";

function makeSection(top, bottom, focusEligible = "true", title = "") {
  return {
    dataset: { focusEligible },
    getBoundingClientRect: () => ({ top, bottom }),
    querySelector: (selector) => (selector === "h2" ? { textContent: title } : null),
  };
}

function makeReader(sections, directSection = null) {
  return {
    clientHeight: 100,
    getBoundingClientRect: () => ({ top: 0, left: 20, width: 200 }),
    querySelectorAll: vi.fn(() => sections),
    contains: vi.fn((section) => section === directSection),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("static reader regions", () => {
  it("resolves the section directly under the focus rail", () => {
    const section = makeSection(0, 100);
    const reader = makeReader([], section);
    const elementFromPoint = vi.fn(() => ({ closest: () => section }));
    vi.stubGlobal("document", { elementFromPoint });

    expect(sectionAtFocusRail(reader)).toBe(section);
    expect(elementFromPoint).toHaveBeenCalledWith(120, 38);
    expect(reader.querySelectorAll).not.toHaveBeenCalled();
  });

  it("falls back to bounds and front matter detection", () => {
    const containing = makeSection(20, 100);
    const reader = makeReader([makeSection(0, 20), containing]);
    vi.stubGlobal("document", { elementFromPoint: () => null });

    expect(sectionAtFocusRail(reader)).toBe(containing);

    const firstSection = makeSection(100, 200, "false");
    const frontMatterReader = makeReader([firstSection]);
    expect(sectionAtFocusRail(frontMatterReader)).toBe(firstSection);
  });

  it("names end matter and introductory regions", () => {
    const section = (title) => ({ querySelector: () => ({ textContent: title }) });

    expect(staticRegionName(section("References"))).toBe("Reading the end matter");
    expect(staticRegionName(section("Introduction"))).toBe("Reading the intro");
    expect(staticRegionName()).toBe("Reading the intro");
  });
});
