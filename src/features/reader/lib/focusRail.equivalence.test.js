import { describe, expect, it } from "vitest";
import { selectClosestParagraph, selectNextParagraph } from "./focusRail.js";

/**
 * The previous implementation, kept verbatim as a reference oracle. The hot
 * path was rewritten to cache ordering and binary search, so every result must
 * still match this one exactly.
 */
function referenceOrdered(paragraphs) {
  const list = Array.isArray(paragraphs) ? paragraphs : [];
  return list
    .filter((p) => p && Number.isFinite(p.top) && Number.isFinite(p.bottom))
    .sort(
      (a, b) => a.top - b.top || a.left - b.left || String(a.id ?? '').localeCompare(String(b.id ?? ''))
    );
}

function referenceClosest(paragraphs, anchorY, currentId = '') {
  const ordered = referenceOrdered(paragraphs);
  if (!ordered.length) return null;
  const crossing = ordered.filter((p) => p.top <= anchorY && p.bottom >= anchorY);
  if (crossing.length) return crossing.find((p) => p.id === currentId) ?? crossing[0];
  return ordered.reduce((closest, paragraph) => {
    const paragraphCenter = (paragraph.top + paragraph.bottom) / 2;
    const closestCenter = (closest.top + closest.bottom) / 2;
    return Math.abs(paragraphCenter - anchorY) < Math.abs(closestCenter - anchorY) ? paragraph : closest;
  });
}

function referenceNext(paragraphs, currentId, direction, step = 1) {
  const ordered = referenceOrdered(paragraphs);
  if (!ordered.length) return null;
  const safeStep = Number.isFinite(Number(step)) ? Math.max(1, Math.round(Number(step))) : 1;
  const currentIndex = ordered.findIndex((p) => p.id === currentId);
  const startIndex = currentIndex < 0 ? (direction > 0 ? -1 : ordered.length) : currentIndex;
  const nextIndex = Math.min(ordered.length - 1, Math.max(0, startIndex + Math.sign(direction) * safeStep));
  return ordered[nextIndex];
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildLayout(random, count, { overlap = false, shuffle = false, gaps = true } = {}) {
  const list = [];
  let top = 0;
  for (let index = 0; index < count; index += 1) {
    const height = 18 + Math.floor(random() * 60);
    const topOffset = gaps && random() < 0.3 ? 4 + Math.floor(random() * 30) : 0;
    top += topOffset;
    list.push({
      id: `p-${index}`,
      top,
      bottom: overlap && random() < 0.4 ? top + height + 30 : top + height,
      left: Math.floor(random() * 20),
    });
    top += height;
  }
  if (shuffle) {
    for (let index = list.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [list[index], list[swap]] = [list[swap], list[index]];
    }
  }
  return list;
}

describe("focusRail equivalence with the reference implementation", () => {
  const scenarios = [
    { name: "ordered, no overlap", overlap: false, shuffle: false },
    { name: "ordered, overlapping", overlap: true, shuffle: false },
    { name: "shuffled, no overlap", overlap: false, shuffle: true },
    { name: "shuffled, overlapping", overlap: true, shuffle: true },
  ];

  for (const scenario of scenarios) {
    it(`matches the oracle: ${scenario.name}`, () => {
      for (let seed = 1; seed <= 40; seed += 1) {
        const random = mulberry32(seed * 7919);
        const count = 1 + Math.floor(random() * 60);
        const paragraphs = buildLayout(random, count, scenario);
        const span = paragraphs.reduce((max, p) => Math.max(max, p.bottom), 0);

        for (let probe = 0; probe < 40; probe += 1) {
          const anchorY = Math.floor(random() * (span + 40)) - 20;
          const currentId = random() < 0.4 && paragraphs.length ? paragraphs[Math.floor(random() * paragraphs.length)].id : "";

          const actual = selectClosestParagraph(paragraphs, anchorY, currentId);
          const expected = referenceClosest(paragraphs, anchorY, currentId);
          expect(actual?.id ?? null, `seed ${seed} probe ${probe} anchor ${anchorY}`).toBe(expected?.id ?? null);

          for (const direction of [1, -1]) {
            for (const step of [1, 3, 99]) {
              const a = selectNextParagraph(paragraphs, currentId, direction, step);
              const b = referenceNext(paragraphs, currentId, direction, step);
              expect(a?.id ?? null, `next seed ${seed} dir ${direction} step ${step}`).toBe(b?.id ?? null);
            }
          }
        }
      }
    });
  }

  it("handles degenerate input identically", () => {
    for (const input of [[], null, undefined, [null, undefined], [{ top: NaN, bottom: 1 }], [{ top: 0, bottom: 0 }]]) {
      expect(selectClosestParagraph(input, 10)?.id ?? null).toBe(referenceClosest(input, 10)?.id ?? null);
      expect(selectNextParagraph(input, "x", 1)?.id ?? null).toBe(referenceNext(input, "x", 1)?.id ?? null);
    }
  });

  it("survives a non-finite anchor", () => {
    const paragraphs = [
      { id: "a", top: 0, bottom: 20, left: 0 },
      { id: "b", top: 30, bottom: 50, left: 0 },
    ];
    expect(selectClosestParagraph(paragraphs, Number.NaN)?.id).toBe(referenceClosest(paragraphs, Number.NaN)?.id);
  });

  it("returns a cached order without re-measuring an unchanged list", () => {
    const paragraphs = [
      { id: "a", top: 0, bottom: 20, left: 0 },
      { id: "b", top: 30, bottom: 50, left: 0 },
    ];
    const first = selectClosestParagraph(paragraphs, 10);
    const second = selectClosestParagraph(paragraphs, 35);
    expect(first.id).toBe("a");
    expect(second.id).toBe("b");
    expect(selectClosestParagraph(paragraphs, 10)).toBe(first);
  });
});

describe("focusRail cost on a long book", () => {
  function buildBook(count) {
    const paragraphs = [];
    let top = 0;
    for (let index = 0; index < count; index += 1) {
      paragraphs.push({ id: `p-${index}`, top, bottom: top + 34, left: 0 });
      top += 34;
    }
    return { paragraphs, span: top };
  }

  function time(fn, paragraphs, span, iterations) {
    for (let index = 0; index < 200; index += 1) {
      fn(paragraphs, (index * 37) % span, paragraphs[index % paragraphs.length].id);
    }
    const started = performance.now();
    for (let index = 0; index < iterations; index += 1) {
      fn(paragraphs, (index * 37) % span, paragraphs[index % paragraphs.length].id);
    }
    return performance.now() - started;
  }

  it.each([500, 2000, 8000])("stays far cheaper than the oracle at n=%i", (count) => {
    const { paragraphs, span } = buildBook(count);
    const optimized = time(selectClosestParagraph, paragraphs, span, 3000);
    const original = time(referenceClosest, paragraphs, span, 3000);

    expect(selectClosestParagraph(paragraphs, 50, "p-1").id).toBe("p-1");
    expect(optimized).toBeLessThan(original);
    console.log(
      `focusRail n=${count} optimized=${optimized.toFixed(1)}ms original=${original.toFixed(1)}ms speedup=${(original / optimized).toFixed(1)}x`
    );
  });

  it("keeps a single selection well inside one frame on a 4000 paragraph book", () => {
    const { paragraphs, span } = buildBook(4000);
    const optimized = time(selectClosestParagraph, paragraphs, span, 3000);
    const perCall = optimized / 3000;
    expect(perCall).toBeLessThan(0.1);
  });
});
