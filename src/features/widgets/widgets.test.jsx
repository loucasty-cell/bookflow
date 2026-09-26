import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WidgetFrame, WidgetMeter, WidgetRing } from "./components/WidgetFrame.jsx";
import {
  ContinueWidget,
  GoalWidget,
  ListWidget,
  RingsWidget,
  StatWidget,
} from "./components/BookflowWidgets.jsx";
import { WIDGET_RADIUS, WIDGET_SIZES, widgetBox } from "./lib/tokens.js";
import { findWidgetById, widgetSpec, widgetsBySize } from "./lib/specIndex.js";

describe("widget geometry tokens", () => {
  it("matches the sizes measured in the Figma file", () => {
    expect(WIDGET_SIZES).toEqual({
      small: { width: 155, height: 155 },
      medium: { width: 329, height: 155 },
      large: { width: 329, height: 345 },
    });
    expect(WIDGET_RADIUS).toBe(21.67);
  });

  it("preserves the published aspect ratio for each size", () => {
    expect(widgetBox("small").width / widgetBox("small").height).toBeCloseTo(1, 5);
    expect(widgetBox("medium").width / widgetBox("medium").height).toBeCloseTo(329 / 155, 5);
    expect(widgetBox("large").width / widgetBox("large").height).toBeCloseTo(329 / 345, 5);
  });
});

describe("figma spec", () => {
  it("holds every extracted component with a unique Figma node id", () => {
    expect(widgetSpec).toHaveLength(83);
    const ids = new Set(widgetSpec.map((entry) => entry.id));
    expect(ids.size).toBe(83);
  });

  it("gives every entry a name and a known size bucket", () => {
    for (const entry of widgetSpec) {
      expect(entry.name, `missing name for ${entry.id}`).toBeTruthy();
      expect(["small", "medium", "large", "part"]).toContain(entry.size);
    }
  });

  it("resolves a known node id to the Figma name", () => {
    expect(findWidgetById("6:880")?.name).toBe("Medium / Weather");
    expect(findWidgetById("0:0")).toBeNull();
  });

  it("buckets the three home-screen sizes", () => {
    expect(widgetsBySize("small").length).toBeGreaterThan(0);
    expect(widgetsBySize("medium").length).toBeGreaterThan(0);
    expect(widgetsBySize("large").length).toBeGreaterThan(0);
  });
});

describe("WidgetFrame", () => {
  it("emits the measured aspect ratio and radius", () => {
    const markup = renderToStaticMarkup(<WidgetFrame size="medium" title="Reading" />);
    expect(markup).toContain('data-size="medium"');
    expect(markup).toContain("aspect-ratio:329 / 155");
    expect(markup).toContain("border-radius:21.67px");
  });

  it("labels the region for assistive technology", () => {
    const markup = renderToStaticMarkup(<WidgetFrame title="Annual goal" />);
    expect(markup).toContain('aria-label="Annual goal"');
  });

  it("switches to the gradient surface only when a gradient is supplied", () => {
    expect(renderToStaticMarkup(<WidgetFrame gradient="linear-gradient(180deg, #000, #fff)" />)).toContain(
      'data-surface="gradient"',
    );
    expect(renderToStaticMarkup(<WidgetFrame surface="paper" />)).toContain('data-surface="paper"');
  });
});

describe("WidgetRing", () => {
  it("drives the arc from the clamped ratio", () => {
    const markup = renderToStaticMarkup(<WidgetRing ratio={0.5} size={40} stroke={4} />);
    const circumference = 2 * Math.PI * 18;
    expect(markup).toContain(`stroke-dashoffset="${circumference * 0.5}"`);
    expect(markup).toContain('transform="rotate(-90 20 20)"');
  });

  it("clamps out-of-range ratios instead of drawing a negative arc", () => {
    const high = renderToStaticMarkup(<WidgetRing ratio={4} size={40} stroke={4} />);
    expect(high).toContain('stroke-dashoffset="0"');
    const low = renderToStaticMarkup(<WidgetRing ratio={-2} size={40} stroke={4} />);
    expect(low).toContain(`stroke-dashoffset="${2 * Math.PI * 18}"`);
  });
});

describe("WidgetMeter", () => {
  it("exposes progress to assistive technology as a percentage", () => {
    const markup = renderToStaticMarkup(<WidgetMeter ratio={0.42} />);
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuenow="42"');
    expect(markup).toContain("width:42%");
  });
});

describe("GoalWidget", () => {
  it("labels the goal as annual books, never as a streak", () => {
    const goal = { enabled: true, ratio: 0.25, percent: 25, booksFinished: 3, target: 12, year: 2026 };
    const markup = renderToStaticMarkup(<GoalWidget goal={goal} title="Annual goal" />);
    expect(markup).toContain("3 of 12 books in 2026");
    expect(markup).not.toMatch(/streak|consecutive|days in a row/i);
  });

  it("shows the off state rather than a false zero when the goal is disabled", () => {
    const markup = renderToStaticMarkup(<GoalWidget goal={{ enabled: false }} title="Annual goal" />);
    expect(markup).toContain("Annual goal is off");
    expect(markup).not.toContain("0 of");
  });
});

describe("ContinueWidget", () => {
  it("invites a first book when nothing is in progress", () => {
    const markup = renderToStaticMarkup(<ContinueWidget entry={null} />);
    expect(markup).toContain("Open a book to begin");
  });

  it("shows title, chapter and progress for a real entry", () => {
    const entry = {
      documentId: "a.txt:1:2",
      title: "Meditations",
      author: "Descartes",
      kind: "TXT",
      progress: 62,
      activeChapter: 2,
      totalChapters: 7,
    };
    const markup = renderToStaticMarkup(<ContinueWidget entry={entry} onResume={vi.fn()} />);
    expect(markup).toContain("Meditations");
    expect(markup).toContain("Chapter 3 of 7");
    expect(markup).toContain("62% read");
  });

  it("keeps the resume control a 44px target in the stylesheet, not inline", () => {
    const markup = renderToStaticMarkup(
      <ContinueWidget entry={{ title: "A", progress: 1, activeChapter: 0, totalChapters: 1 }} onResume={vi.fn()} />,
    );
    expect(markup).toMatch(/type="button"/);
    expect(markup).toContain('class="widget-resume"');
    expect(markup).not.toMatch(/min-height/i);

    const styles = readFileSync(new URL("./lib/widgets.css", import.meta.url), "utf8");
    const block = styles.match(/\.widget-resume\s*\{[^}]*\}/s);
    expect(block).not.toBeNull();
    expect(block[0]).toMatch(/min-height:\s*44px/);
  });

  it("omits the chapter label when the book has a single chapter", () => {
    const markup = renderToStaticMarkup(
      <ContinueWidget entry={{ title: "A", progress: 1, activeChapter: 0, totalChapters: 1, kind: "PDF" }} />,
    );
    expect(markup).toContain("PDF");
    expect(markup).not.toContain("Chapter");
  });
});

describe("ListWidget", () => {
  it("renders rows when present and an empty label when not", () => {
    const filled = renderToStaticMarkup(<ListWidget rows={[{ id: "a", label: "Meditations" }]} title="Library" />);
    expect(filled).toContain("Meditations");
    const empty = renderToStaticMarkup(<ListWidget rows={[]} title="Library" emptyLabel="No books yet." />);
    expect(empty).toContain("No books yet.");
  });
});

describe("RingsWidget and StatWidget", () => {
  it("renders one ring per supplied ring", () => {
    const markup = renderToStaticMarkup(
      <RingsWidget rings={[{ id: "a", ratio: 0.5 }, { id: "b", ratio: 0.25 }]} title="In progress" />,
    );
    expect((markup.match(/class="widget-ring"/g) ?? []).length).toBe(2);
  });

  it("shows a value and caption on the stat surface", () => {
    const markup = renderToStaticMarkup(<StatWidget value="13 hr" caption="161.9k words" title="Time reading" />);
    expect(markup).toContain("13 hr");
    expect(markup).toContain("161.9k words");
  });
});
