import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NotesPanel } from "./NotesPanel.jsx";

describe("NotesPanel component", () => {
  it("renders closed notes panel with aria-hidden true", () => {
    const markup = renderToStaticMarkup(
      <NotesPanel
        open={false}
        close={vi.fn()}
        notes={[]}
        setNotes={vi.fn()}
        bookTitle="The Great Gatsby"
        bookId="gatsby-1"
      />
    );

    expect(markup).toContain('id="reader-notes-panel"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('inert=""');
  });

  it("renders open notes panel with session context, bold toggle, macOS traffic lights, and empty state", () => {
    const markup = renderToStaticMarkup(
      <NotesPanel
        open={true}
        close={vi.fn()}
        notes={[]}
        setNotes={vi.fn()}
        bookTitle="Moby Dick"
        bookId="moby-1"
        activeChapterTitle="Loomings"
        progress={33}
      />
    );

    expect(markup).toContain("Session Notes");
    expect(markup).toContain("Moby Dick");
    expect(markup).toContain("Loomings");
    expect(markup).toContain("33% read");
    expect(markup).toContain("Bold Note");
    expect(markup).toContain("Save Note");
    expect(markup).toContain("macos-traffic-lights");
    expect(markup).toContain("macos-dot-close");
    expect(markup).toContain("Your margins are quiet");
  });

  it("renders saved notes with macOS card elements, bold emphasis, and Export PDF action", () => {
    const notes = [
      {
        id: "note-1",
        text: "Crucial bold argument",
        bold: true,
        quote: "Call me Ishmael",
        createdAt: 1700000000000,
      },
      {
        id: "note-2",
        text: "Secondary observation",
        bold: false,
        createdAt: 1700000050000,
      },
    ];

    const markup = renderToStaticMarkup(
      <NotesPanel
        open={true}
        close={vi.fn()}
        notes={notes}
        setNotes={vi.fn()}
        bookTitle="Moby Dick"
        bookId="moby-1"
      />
    );

    expect(markup).toContain("Crucial bold argument");
    expect(markup).toContain("Call me Ishmael");
    expect(markup).toContain("BOLD");
    expect(markup).toContain("Secondary observation");
    expect(markup).toContain("REGULAR");
    expect(markup).toContain("Export PDF");
    expect(markup).toContain("macos-card-dots");
    expect(markup).toContain("macos-card-dot-red");
    expect(markup).toContain("macos-scrollable");
  });
});
