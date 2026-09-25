import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotesExportStatus, NotesPanel } from "./NotesPanel.jsx";
import {
  NOTES_EXPORT_STATUS,
  describeReplacedGlyphs,
  downloadBlob,
  notesFilename,
  revokePendingDownloads,
  runNotesPdfExport,
} from "../lib/notesExport.js";

function installDownloadStub() {
  const clicked = [];
  const revoked = [];
  const body = {
    children: [],
    appendChild(node) {
      this.children.push(node);
    },
    removeChild(node) {
      this.children = this.children.filter((child) => child !== node);
    },
  };

  const previousDocument = globalThis.document;
  const previousCreate = URL.createObjectURL;
  const previousRevoke = URL.revokeObjectURL;

  globalThis.document = {
    body,
    createElement() {
      const node = {
        style: {},
        click() {
          clicked.push(node);
        },
      };
      return node;
    },
  };
  let counter = 0;
  URL.createObjectURL = () => {
    counter += 1;
    return `blob:bookflow-notes/${counter}`;
  };
  URL.revokeObjectURL = (url) => {
    revoked.push(url);
  };

  return {
    clicked,
    revoked,
    body,
    restore() {
      globalThis.document = previousDocument;
      URL.createObjectURL = previousCreate;
      URL.revokeObjectURL = previousRevoke;
    },
  };
}

afterEach(() => {
  revokePendingDownloads();
  vi.restoreAllMocks();
});

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

  it("shows no export status region while the export is idle", () => {
    const markup = renderToStaticMarkup(
      <NotesPanel
        open={true}
        close={vi.fn()}
        notes={[{ id: "note-1", text: "Observation", bold: false, createdAt: 1700000000000 }]}
        setNotes={vi.fn()}
        bookTitle="Moby Dick"
        bookId="moby-1"
      />
    );

    expect(markup).not.toContain('role="alert"');
    expect(markup).not.toContain('aria-live="assertive"');
    expect(markup).not.toContain("notes-export-notice");
    expect(markup).toContain("Export PDF");
  });

  it("disables PDF export when there are no notes", () => {
    const markup = renderToStaticMarkup(
      <NotesPanel
        open={true}
        close={vi.fn()}
        notes={[]}
        setNotes={vi.fn()}
        bookTitle="Moby Dick"
        bookId="moby-1"
      />
    );

    expect(markup).toMatch(/notes-pdf-export-btn[^>]*disabled=""/);
  });
});

describe("NotesExportStatus", () => {
  it("renders nothing while idle or working", () => {
    expect(renderToStaticMarkup(<NotesExportStatus status={NOTES_EXPORT_STATUS.IDLE} />)).toBe("");
    expect(
      renderToStaticMarkup(<NotesExportStatus status={NOTES_EXPORT_STATUS.WORKING} message="ignored" />)
    ).toBe("");
  });

  it("renders an assertive alert with the failure message and a dismiss control", () => {
    const markup = renderToStaticMarkup(
      <NotesExportStatus
        status={NOTES_EXPORT_STATUS.ERROR}
        message="PDF export failed. Your notes are still saved locally."
        onDismiss={vi.fn()}
      />
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('aria-live="assertive"');
    expect(markup).toContain("PDF export failed");
    expect(markup).toContain("Your notes are still saved locally.");
    expect(markup).toContain('aria-label="Dismiss export error"');
    expect(markup).toContain("border-radius:24px");
    expect(markup).toContain("padding:12px 20px");
  });

  it("announces replaced glyph counts only when characters were replaced", () => {
    const clean = renderToStaticMarkup(
      <NotesExportStatus status={NOTES_EXPORT_STATUS.SUCCESS} replacedGlyphs={0} />
    );
    expect(clean).toBe("");

    const replaced = renderToStaticMarkup(
      <NotesExportStatus status={NOTES_EXPORT_STATUS.SUCCESS} replacedGlyphs={3} />
    );
    expect(replaced).toContain('role="status"');
    expect(replaced).toContain('aria-live="polite"');
    expect(replaced).toContain("3 emoji or non-Latin characters were replaced");
    expect(replaced).toContain("Markdown export keeps them.");
    expect(replaced).toContain("border-radius:16px");
    expect(replaced).toContain("padding:6px 12px");
  });

  it("keeps the glyph notice until dismissed and yields to a newer error", () => {
    const lingering = renderToStaticMarkup(
      <NotesExportStatus status={NOTES_EXPORT_STATUS.IDLE} replacedGlyphs={1} />
    );
    expect(lingering).toContain("1 emoji or non-Latin character was replaced");

    const errorWins = renderToStaticMarkup(
      <NotesExportStatus
        status={NOTES_EXPORT_STATUS.ERROR}
        message="PDF export failed."
        replacedGlyphs={4}
      />
    );
    expect(errorWins).toContain('role="alert"');
    expect(errorWins).not.toContain("replaced in the PDF");
  });

  it("uses singular wording for a single replaced character", () => {
    expect(describeReplacedGlyphs(1)).toContain("1 emoji or non-Latin character was replaced");
    expect(describeReplacedGlyphs(0)).toBe("");
    expect(describeReplacedGlyphs(undefined)).toBe("");
  });
});

describe("notes export outcomes", () => {
  const notes = [{ id: "note-1", text: "Observation", bold: false, createdAt: 1700000000000 }];

  it("reports a user-visible message when the PDF export fails", async () => {
    const outcome = await runNotesPdfExport({
      notes,
      bookTitle: "Moby Dick",
      chapterTitle: "Loomings",
      progress: 42,
      exportPdf: async () => {
        throw new Error("WinAnsi cannot encode");
      },
    });

    expect(outcome.status).toBe(NOTES_EXPORT_STATUS.ERROR);
    expect(outcome.message).toContain("PDF export failed");
    expect(outcome.message).toContain("Use Markdown export to keep emoji and non-Latin text.");
  });

  it("passes the panel session context to the exporter and returns the download summary", async () => {
    const exportPdf = vi.fn(async () => ({ size: 2048, pages: 3, replacedGlyphs: 0 }));
    const outcome = await runNotesPdfExport({
      notes,
      bookTitle: "",
      chapterTitle: "",
      progress: Number.NaN,
      exportPdf,
    });

    expect(exportPdf).toHaveBeenCalledWith({
      notes,
      bookTitle: "Bookflow Reading Session",
      chapterTitle: "",
      progress: null,
    });
    expect(outcome.status).toBe(NOTES_EXPORT_STATUS.SUCCESS);
    expect(outcome.result).toEqual({ size: 2048, pages: 3, replacedGlyphs: 0 });
  });

  it("stays idle when there is nothing to export", async () => {
    const exportPdf = vi.fn();
    const outcome = await runNotesPdfExport({ notes: [], exportPdf });
    expect(outcome.status).toBe(NOTES_EXPORT_STATUS.IDLE);
    expect(exportPdf).not.toHaveBeenCalled();
  });

  it("downloads markdown through the shared filename sanitizer and revokes the URL", () => {
    const stub = installDownloadStub();
    try {
      downloadBlob(new Blob(["# Reading Notes"]), notesFilename("Moby Dick", "md"));

      expect(stub.clicked).toHaveLength(1);
      expect(stub.clicked[0].download).toBe("moby-dick-notes.md");
      expect(stub.body.children).toHaveLength(0);

      revokePendingDownloads();
      expect(stub.revoked).toEqual(["blob:bookflow-notes/1"]);
    } finally {
      stub.restore();
    }
  });

  it("ignores downloads when no DOM is available", () => {
    const previousDocument = globalThis.document;
    const previousCreate = URL.createObjectURL;
    globalThis.document = undefined;
    URL.createObjectURL = undefined;
    try {
      expect(downloadBlob(new Blob(["x"]), "x.md")).toBe(false);
    } finally {
      globalThis.document = previousDocument;
      URL.createObjectURL = previousCreate;
    }
  });
});
