import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({
  file: null,
  isDragging: false,
  jobId: null,
  status: "processing",
  error: null,
  ocrProfile: "small",
  progress: {
    currentPage: 0,
    totalPages: 0,
    percent: 1,
    totalWords: 0,
    pagesPerSecond: 0,
    elapsedSeconds: 0,
  },
  pages: [],
  skippedPages: [],
  activePageIndex: 0,
  setActivePageIndex: vi.fn(),
  searchQuery: "",
  setSearchQuery: vi.fn(),
  copiedType: null,
  setCopiedType: vi.fn(),
  viewMode: "formatted",
  setViewMode: vi.fn(),
  jumpPageInput: "",
  setJumpPageInput: vi.fn(),
  jumpError: "",
  setJumpError: vi.fn(),
  fileInputRef: { current: null },
  setOcrProfile: vi.fn(),
  setError: vi.fn(),
  handleDragOver: vi.fn(),
  handleDragLeave: vi.fn(),
  handleDrop: vi.fn(),
  handleFileSelect: vi.fn(),
  startScan: vi.fn(),
  handleCancelScan: vi.fn(),
  handleReset: vi.fn(),
  loadDocument: vi.fn(),
}));

vi.mock("../hooks/useOcrSession.js", () => ({ useOcrSession: () => session }));

globalThis.React = React;
const { OcrUploader } = await import("./OcrUploader.jsx");

describe("OcrUploader accessibility", () => {
  it("exposes named controls and progress semantics", () => {
    const markup = renderToStaticMarkup(<OcrUploader />);

    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-label="OCR scan progress"');
    expect(markup).toContain('aria-valuemin="0"');
    expect(markup).toContain('aria-valuemax="100"');
    expect(markup).toContain('aria-valuenow="1"');
    expect(markup).toContain('aria-label="Cancel OCR scan"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).not.toContain('Read in Focus Mode');
  });
});
