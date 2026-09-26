import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  LENS_ACTIONS,
  LENS_KEYBOARD_STEP,
  LENS_POSITION_STORAGE_KEY,
  LENS_WINDOW_MARGIN,
  clampLensPosition,
  lensKeyboardDelta,
  lensStateAttribute,
  parseLensPosition,
  quickActionStatus,
  serializeLensPosition,
} from "../hooks/useReadingLens.js";
import { FocusCard } from "./FocusCard.jsx";

const paragraph = {
  id: "p-1",
  text: "Call me Ishmael. Some years ago, never mind how long precisely, having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little.",
};

function renderCard(props = {}) {
  return renderToStaticMarkup(
    <FocusCard
      focusedParagraph={paragraph}
      pinnedId=""
      isBookmarked={false}
      toggleBookmark={vi.fn()}
      copyFocusedParagraph={vi.fn()}
      moveFocus={vi.fn()}
      resumeFlow={vi.fn()}
      {...props}
    />,
  );
}

describe("lens window clamp", () => {
  it("keeps the card inside the bounds with a readable margin", () => {
    expect(
      clampLensPosition({
        left: -400,
        top: -80,
        width: 360,
        height: 220,
        viewportWidth: 1200,
        viewportHeight: 800,
      }),
    ).toEqual({ left: LENS_WINDOW_MARGIN, top: LENS_WINDOW_MARGIN });

    expect(
      clampLensPosition({
        left: 5000,
        top: 5000,
        width: 360,
        height: 220,
        viewportWidth: 1200,
        viewportHeight: 800,
      }),
    ).toEqual({ left: 1200 - 360 - LENS_WINDOW_MARGIN, top: 800 - 220 - LENS_WINDOW_MARGIN });
  });

  it("never returns a negative position and survives missing metrics", () => {
    const clamped = clampLensPosition({
      left: Number.NaN,
      top: undefined,
      width: Number.NaN,
      height: 0,
      viewportWidth: 320,
      viewportHeight: 480,
    });
    expect(clamped).toEqual({ left: LENS_WINDOW_MARGIN, top: LENS_WINDOW_MARGIN });
  });

  it("uses arrow-key deltas and ignores unrelated keys", () => {
    expect(lensKeyboardDelta("ArrowUp")).toEqual({ x: 0, y: -LENS_KEYBOARD_STEP });
    expect(lensKeyboardDelta("ArrowRight", 72)).toEqual({ x: 72, y: 0 });
    expect(lensKeyboardDelta("Enter")).toBeNull();
    expect(lensKeyboardDelta("ArrowDown", 0)).toEqual({ x: 0, y: LENS_KEYBOARD_STEP });
  });
});

describe("lens position persistence", () => {
  it("round-trips a position and rejects unsafe values", () => {
    expect(serializeLensPosition({ left: 24.456, top: 88 })).toBe("24.46,88");
    expect(parseLensPosition("24.46,88")).toEqual({ left: 24.46, top: 88 });
    expect(parseLensPosition("nonsense")).toBeNull();
    expect(parseLensPosition("")).toBeNull();
    expect(serializeLensPosition({ left: Number.NaN, top: 4 })).toBe("");
    expect(serializeLensPosition(null)).toBe("");
    expect(LENS_POSITION_STORAGE_KEY).toBe("bookflow:lens_position");
  });
});

describe("lens quick action and state mapping", () => {
  it("maps hook state to a data attribute state", () => {
    expect(lensStateAttribute("requesting")).toBe("running");
    expect(lensStateAttribute("streaming")).toBe("running");
    expect(lensStateAttribute("complete")).toBe("complete");
    expect(lensStateAttribute("")).toBe("idle");
  });

  it("marks the running action and keeps the rest honest", () => {
    const running = { status: "streaming", activeAction: "summarize", consentGranted: true };
    expect(quickActionStatus({ ...running, actionId: "summarize" })).toBe("Running");
    expect(quickActionStatus({ ...running, actionId: "explain" })).toBe("Queued");
    expect(
      quickActionStatus({ status: "idle", activeAction: "", actionId: "explain", consentGranted: false }),
    ).toBe("Local");
    expect(
      quickActionStatus({ status: "idle", activeAction: "", actionId: "explain", consentGranted: true }),
    ).toBe("Ready");
    expect(
      quickActionStatus({ status: "error", activeAction: "", actionId: "explain", consentGranted: true }),
    ).toBe("Retry");
    expect(
      quickActionStatus({ status: "complete", activeAction: "", actionId: "explain", consentGranted: true }),
    ).toBe("Done");
  });
});

describe("FocusCard structure", () => {
  it("does not duplicate the selected passage back at the reader", () => {
    const selection = "The precise passage the reader highlighted, kept whole for consent.";
    const markup = renderCard({ selectedText: selection });
    expect(markup).not.toContain(selection);
    expect(markup).not.toContain("<blockquote");
    expect(markup).not.toContain("lens-passage-figure");
    expect(markup).toMatch(/chars .* on device/);
  });

  it("leads with a title and one line of supporting text, no paragraph", () => {
    const markup = renderCard();
    expect(markup).toContain("Select text to ask Lens.");
    expect(markup).toContain("Reading Lens");
    expect(markup).toContain('class="lens-head-sub"');
    expect(markup).not.toContain("lens-consent-hint");
    expect(markup).not.toContain("lens-chapter-hint");
    expect(markup).not.toContain("lens-passage-figure");
  });

  it("toggles the focus panel from the header", () => {
    const markup = renderCard();
    expect(markup).toContain("lens-head-toggle");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("Expand Reading Lens");
  });

  it("carries consent as a single toggle inside the input pill", () => {
    const markup = renderCard();
    expect(markup).toContain("lens-consent-dot");
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain("Allow sending this passage to Lens");
    expect(markup).not.toContain('type="checkbox"');
    expect(markup).not.toContain("Send passage to Lens");
  });

  it("keeps the chapter opt-in as one icon toggle, off and disabled without chapter text", () => {
    const markup = renderCard({ chapterTitle: "Loomings" });
    expect(markup).toContain("lens-chapter-toggle");
    expect(markup).toContain("Include the current chapter as context");
    expect(markup).toContain("Chapter text is not available here");
    expect(markup).toMatch(/class="lens-chapter-toggle[^"]*"[^>]*disabled/);
  });

  it("keeps a live status region for assistive technology", () => {
    const markup = renderCard();
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
  });

  it("renders quick actions as icon only, with no repeated state label", () => {
    const markup = renderCard();
    expect(markup).not.toContain("lens-quick-action-status");
    expect(markup).not.toContain(">Local<");
  });

  it("wires every quick action to the lens contract", () => {
    const markup = renderCard();
    for (const action of LENS_ACTIONS) {
      expect(markup).toContain(`data-lens-action="${action.id}"`);
      expect(markup).toContain(`${action.label} this passage`);
    }
    expect(markup).toContain('aria-label="Reading Lens quick actions"');
  });

  it("disables quick actions when there is no passage at all", () => {
    const markup = renderCard({ focusedParagraph: { id: "p-2", text: "" } });
    expect(markup).toMatch(/data-lens-action="summarize"[^>]*disabled/);
  });

  it("moves through a dedicated drag handle without a transform conflict", () => {
    const markup = renderCard();
    expect(markup).toMatch(/<button[^>]*class="focus-card-drag-pill lens-drag-handle"/);
    expect(markup).toMatch(/<button[^>]*type="button"/);
    expect(markup).toContain("Move Reading Lens panel");
    expect(markup).toContain("touch-action:none");
    expect(markup).not.toContain("transform");
  });

  it("keeps focus navigation, bookmark, copy, and note actions", () => {
    const markup = renderCard({ selectedText: "A note-worthy line.", pinnedId: "p-1" });
    expect(markup).toContain('aria-label="Previous paragraph"');
    expect(markup).toContain('aria-label="Next paragraph"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain('aria-label="Bookmark this paragraph"');
    expect(markup).toContain('aria-label="Copy this paragraph"');
    expect(markup).toContain('aria-label="Add a note from the selected passage"');
    expect(markup).toContain('aria-label="Resume guided reading flow"');
  });

  it("hides the note action when nothing is selected", () => {
    const markup = renderCard();
    expect(markup).not.toContain('aria-label="Add a note from the selected passage"');
  });

  it("gives every card control a 44px hit area and an accessible name", () => {
    const markup = renderCard();
    const buttons = markup.match(/<button[^>]*>/g) ?? [];
    expect(buttons.length).toBeGreaterThan(6);
    for (const button of buttons) {
      expect(button).toMatch(/aria-label="[^"]+"/);
      expect(button).toMatch(/type="(button|submit)"/);
      if (button.includes("lens-drag-handle")) continue;
      expect(button).toContain("44px");
    }
    const styles = readFileSync(new URL("../../../styles/reading-lens.css", import.meta.url), "utf8");
    expect(styles).toMatch(/\.focus-card-drag-pill\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/s);
  });

  it("keeps surface color out of inline styles and class attributes", () => {
    const markup = renderCard();
    expect(markup).not.toMatch(/style="[^"]*(?:#[0-9a-fA-F]{3,8}|rgba?\()/);
    expect(markup).not.toMatch(/class="[^"]*\b(?:bg|text|border)-(?:slate|gray|zinc|neutral|stone|amber|emerald|sky|red|blue|green|yellow)-\d{2,3}\b/);
  });

  it("derives card geometry from the reading-lens token layer", () => {
    const styles = readFileSync(new URL("../../../styles/reading-lens.css", import.meta.url), "utf8");
    const cardBlock = styles.match(/\.focus-card\s*\{[^}]*\}/s);
    expect(cardBlock).not.toBeNull();
    expect(styles).toMatch(/--lens-|var\(--/);
    expect(cardBlock[0]).not.toMatch(/#(?:[0-9a-fA-F]{3})\b/);
  });
});
