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
  it("renders the exact selected passage, not a truncated preview", () => {
    const selection = "The precise passage the reader highlighted, kept whole for consent.";
    const markup = renderCard({ selectedText: selection });
    expect(markup).toContain(selection);
    expect(markup).toContain("Selected passage");
    expect(markup).toContain('data-lens-passage="Selected passage"');
  });

  it("labels the focused paragraph when nothing is selected", () => {
    const markup = renderCard();
    expect(markup).toContain("Focused paragraph");
    expect(markup).toContain(paragraph.text);
  });

  it("shows the exact passage, a live status, and a consent control before any request", () => {
    const markup = renderCard();
    expect(markup).toContain('class="focus-card-consent lens-consent"');
    expect(markup).toContain('data-lens-consent="local-only"');
    expect(markup).toContain('type="checkbox"');
    expect(markup).toContain("Send passage to Lens");
    expect(markup).toContain("Select text in the reader before sending anything to Reading Lens.");
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Local only until you allow the passage to be sent");
  });

  it("keeps the chapter opt-in switch off and disabled without chapter text", () => {
    const markup = renderCard({ chapterTitle: "Loomings" });
    expect(markup).toContain("Include chapter context");
    expect(markup).toContain("Chapter text is not available here");
    expect(markup).toMatch(/class="lens-chapter-toggle"[^>]*disabled/);
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

  it("avoids inline Tailwind utilities in the reader card", () => {
    const markup = renderCard();
    for (const utility of ["prose", "text-amber-400", "text-slate-300", "font-semibold", "opacity-"]) {
      expect(markup).not.toContain(utility);
    }
  });
});
