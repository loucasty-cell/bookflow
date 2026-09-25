import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Bold,
  BookOpen,
  Check,
  Clock,
  Copy,
  Download,
  FileDown,
  Loader2,
  Maximize2,
  MessageSquareText,
  Minimize2,
  Plus,
  Quote,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  documentStorageKey,
  getStorageItem,
  safeParse,
  setStorageItem,
  useModalFocus,
} from "../../../shared/lib/index.js";
import { exportNotesAsPdf } from "../lib/notesPdfExport.js";

const VIEW_MODE_STORAGE_KEY = "bookflow:notes-view-mode";
const BOLD_PREF_STORAGE_KEY = "bookflow:notes-bold-preference";

function formatTimestamp(timestamp) {
  if (!timestamp) return "Just now";
  const elapsed = Math.floor((Date.now() - timestamp) / 1000);
  if (elapsed < 60) return "Just now";
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ago`;
  if (elapsed < 86400) return `${Math.floor(elapsed / 3600)}h ago`;
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotesPanel({
  open,
  close,
  notes = [],
  setNotes,
  deleteNote,
  draft = "",
  setDraft,
  addNote,
  focusedParagraph,
  returnFocusRef,
  bookTitle,
  bookId,
  activeChapterTitle,
  progress,
}) {
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);
  const textareaRef = useRef(null);

  // View presentation mode (slide-out drawer vs centered modal dialog)
  const [viewMode, setViewMode] = useState(() => {
    try {
      return getStorageItem(VIEW_MODE_STORAGE_KEY) === "modal" ? "modal" : "drawer";
    } catch {
      return "drawer";
    }
  });

  // User bold preference for the note composer
  const [isBold, setIsBold] = useState(() => {
    try {
      return getStorageItem(BOLD_PREF_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Drawer filtering & search
  const [searchQuery, setSearchQuery] = useState("");
  const [forceAllBold, setForceAllBold] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [quoteDetached, setQuoteDetached] = useState(false);

  // PDF Export state
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfExportSuccess, setPdfExportSuccess] = useState(false);

  // Local draft sync
  const currentDraft = draft ?? "";

  // Focus trap and keyboard handling
  useModalFocus({
    open,
    containerRef: panelRef,
    onClose: close,
    initialFocusRef: textareaRef,
    returnFocusRef,
  });

  // Persist view mode preference
  const toggleViewMode = () => {
    const next = viewMode === "drawer" ? "modal" : "drawer";
    setViewMode(next);
    setStorageItem(VIEW_MODE_STORAGE_KEY, next);
  };

  // Persist bold toggle preference
  const toggleBoldPreference = (value) => {
    const next = typeof value === "boolean" ? value : !isBold;
    setIsBold(next);
    setStorageItem(BOLD_PREF_STORAGE_KEY, String(next));
  };

  // Direct localStorage synchronization helper
  const syncLocalStorage = useCallback(
    (updatedNotes) => {
      if (!bookId) return;
      try {
        setStorageItem(`bookflow:quick-notes:${bookId}`, updatedNotes);
        const docKey = documentStorageKey(bookId);
        const currentDoc = safeParse(getStorageItem(docKey), {});
        if (currentDoc && typeof currentDoc === "object") {
          setStorageItem(docKey, {
            ...currentDoc,
            notes: updatedNotes,
          });
        }
      } catch (err) {
        console.error("Failed to sync notes to localStorage", err);
      }
    },
    [bookId]
  );

  // Save quick note handler
  const handleSaveNote = useCallback(() => {
    const text = currentDraft.trim();
    if (!text) return;

    const attachedQuote = !quoteDetached && focusedParagraph?.text ? focusedParagraph.text : "";
    const attachedParagraphId = !quoteDetached && focusedParagraph?.id ? focusedParagraph.id : "";

    const newNote = {
      id: `note-${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
      paragraphId: attachedParagraphId,
      quote: attachedQuote,
      text,
      bold: isBold,
      createdAt: Date.now(),
      bookId: bookId || "",
      bookTitle: bookTitle || "",
      chapterTitle: activeChapterTitle || "",
    };

    if (typeof addNote === "function") {
      addNote(newNote);
    } else if (typeof setNotes === "function") {
      setNotes((prev) => [newNote, ...(Array.isArray(prev) ? prev : [])]);
    }

    const nextNotes = [newNote, ...(Array.isArray(notes) ? notes : [])];
    syncLocalStorage(nextNotes);

    if (typeof setDraft === "function") {
      setDraft("");
    }
    setQuoteDetached(false);
  }, [
    currentDraft,
    quoteDetached,
    focusedParagraph,
    isBold,
    bookId,
    bookTitle,
    activeChapterTitle,
    addNote,
    setNotes,
    notes,
    syncLocalStorage,
    setDraft,
  ]);

  // Toggle bold on an existing saved note
  const toggleNoteBold = useCallback(
    (noteId) => {
      const updatedNotes = (Array.isArray(notes) ? notes : []).map((n) =>
        n.id === noteId ? { ...n, bold: !n.bold } : n
      );
      if (typeof setNotes === "function") {
        setNotes(updatedNotes);
      }
      syncLocalStorage(updatedNotes);
    },
    [notes, setNotes, syncLocalStorage]
  );

  // Delete note
  const handleDeleteNote = useCallback(
    (noteId) => {
      if (typeof deleteNote === "function") {
        deleteNote(noteId);
      } else if (typeof setNotes === "function") {
        setNotes((prev) => (Array.isArray(prev) ? prev : []).filter((n) => n.id !== noteId));
      }
      const updatedNotes = (Array.isArray(notes) ? notes : []).filter((n) => n.id !== noteId);
      syncLocalStorage(updatedNotes);
    },
    [deleteNote, setNotes, notes, syncLocalStorage]
  );

  // Copy note
  const handleCopyNote = useCallback(async (note) => {
    try {
      const formatted = note.quote
        ? `"${note.quote}"\n\n${note.text}`
        : note.text;
      await navigator.clipboard?.writeText(formatted);
      setCopiedId(note.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Fallback
      setCopiedId(null);
    }
  }, []);

  // Export session notes to PDF (Maintaining bold formatting & macOS card styles)
  const handleExportPdf = useCallback(async () => {
    const list = Array.isArray(notes) ? notes : [];
    if (!list.length || isExportingPdf) return;

    try {
      setIsExportingPdf(true);
      await exportNotesAsPdf({
        notes: list,
        bookTitle: bookTitle || "Bookflow Reading Session",
        chapterTitle: activeChapterTitle || "",
        progress,
      });
      setPdfExportSuccess(true);
      setTimeout(() => setPdfExportSuccess(false), 2400);
    } catch (err) {
      console.error("Failed to export notes as PDF:", err);
    } finally {
      setIsExportingPdf(false);
    }
  }, [notes, isExportingPdf, bookTitle, activeChapterTitle, progress]);

  // Export session notes to Markdown
  const handleExportMarkdown = useCallback(() => {
    const list = Array.isArray(notes) ? notes : [];
    if (!list.length) return;

    const title = bookTitle || "Bookflow Session";
    const header = `# Reading Notes: ${title}\n` +
      `Date: ${new Date().toLocaleDateString()} | Total Notes: ${list.length}\n\n`;

    const body = list
      .map((n, i) => {
        const time = n.createdAt ? new Date(n.createdAt).toLocaleString() : "";
        const quotePart = n.quote ? `> "${n.quote}"\n\n` : "";
        const boldNotice = n.bold ? " **[BOLD EMPHASIS]**" : "";
        return `### Note ${i + 1}${boldNotice} ${time ? `(${time})` : ""}\n${quotePart}${n.text}\n`;
      })
      .join("\n---\n\n");

    const blob = new Blob([header + body], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "notes").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [notes, bookTitle]);

  // Handle keyboard shortcuts in textarea
  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "B")) {
      e.preventDefault();
      toggleBoldPreference();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSaveNote();
    }
  };

  // Filter notes by search
  const filteredNotes = useMemo(() => {
    const list = Array.isArray(notes) ? notes : [];
    if (!searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase();
    return list.filter(
      (n) =>
        String(n.text || "").toLowerCase().includes(query) ||
        String(n.quote || "").toLowerCase().includes(query)
    );
  }, [notes, searchQuery]);

  // Card mouse move spotlight
  const handleCardMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  };

  // Word count telemetry
  const wordCount = useMemo(() => {
    const trimmed = currentDraft.trim();
    return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  }, [currentDraft]);

  return (
    <>
      {open && viewMode === "modal" && (
        <div
          className="notes-modal-backdrop"
          onClick={close}
          aria-hidden="true"
        />
      )}
      <aside
        ref={panelRef}
        id="reader-notes-panel"
        className={`notes-drawer macos-scrollable ${open ? "is-open" : ""} ${viewMode === "modal" ? "is-modal-view" : ""}`}
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-labelledby="reader-notes-title"
        aria-hidden={!open}
        inert={open ? undefined : true}
        tabIndex={-1}
      >
        {/* macOS Top Header Bar */}
        <div className="panel-heading notes-panel-header macos-titlebar">
          <div className="notes-header-left">
            {/* macOS Window Traffic Lights */}
            <div className="macos-traffic-lights" aria-label="Window controls">
              <button
                type="button"
                className="macos-traffic-dot macos-dot-close"
                onClick={close}
                title="Close notes (Esc)"
                aria-label="Close notes"
              />
              <button
                type="button"
                className="macos-traffic-dot macos-dot-minimize"
                onClick={() => {
                  setViewMode("drawer");
                  setStorageItem(VIEW_MODE_STORAGE_KEY, "drawer");
                }}
                title="Dock to slide drawer"
                aria-label="Dock to drawer"
              />
              <button
                type="button"
                className="macos-traffic-dot macos-dot-zoom"
                onClick={toggleViewMode}
                title={viewMode === "modal" ? "Restore to drawer" : "Expand to centered modal"}
                aria-label="Toggle modal view"
              />
            </div>

            <span id="reader-notes-title" className="notes-title-glow">
              <MessageSquareText size={16} className="notes-header-icon" />
              <span>Session Notes</span>
            </span>
            <span className="notes-telemetry-badge font-mono">
              {notes.length} {notes.length === 1 ? "note" : "notes"}
            </span>
          </div>

          <div className="notes-header-actions">
            {/* Export Collection to Downloadable PDF */}
            <button
              type="button"
              className={`notes-pdf-export-btn ${pdfExportSuccess ? "is-success" : ""}`}
              onClick={handleExportPdf}
              disabled={isExportingPdf || notes.length === 0}
              aria-label="Export collection of saved notes to downloadable PDF file"
              title="Download PDF Notebook (maintains bold formatting & macOS card styling)"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Building PDF...</span>
                </>
              ) : pdfExportSuccess ? (
                <>
                  <Check size={13} className="notes-check-downloaded" />
                  <span>PDF Saved!</span>
                </>
              ) : (
                <>
                  <FileDown size={13} />
                  <span>Export PDF</span>
                </>
              )}
            </button>

            {/* Markdown Export Option */}
            {notes.length > 0 && (
              <button
                type="button"
                className="icon-button notes-action-icon"
                onClick={handleExportMarkdown}
                aria-label="Export notes as Markdown"
                title="Export session notes as Markdown"
              >
                <Download size={15} />
              </button>
            )}

            {/* Drawer / Modal Toggle */}
            <button
              type="button"
              className="icon-button notes-action-icon"
              onClick={toggleViewMode}
              aria-label={viewMode === "modal" ? "Switch to slide drawer" : "Switch to centered modal"}
              title={viewMode === "modal" ? "Dock to slide-out drawer" : "Expand to centered modal"}
            >
              {viewMode === "modal" ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <button
              ref={closeButtonRef}
              type="button"
              className="icon-button notes-action-icon"
              onClick={close}
              aria-label="Close notes"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Book Session Breadcrumb & Telemetry */}
        <div className="notes-session-strip">
          <div className="notes-session-info">
            <BookOpen size={12} className="notes-session-icon" />
            <span className="notes-session-title" title={bookTitle || "Current Book"}>
              {bookTitle || "Current Reading Session"}
            </span>
          </div>
          {(Number.isFinite(progress) || activeChapterTitle) && (
            <span className="notes-session-progress font-mono">
              {activeChapterTitle ? `${activeChapterTitle} • ` : ""}
              {Number.isFinite(progress) ? `${progress}% read` : ""}
            </span>
          )}
        </div>

        {/* Note Composer Bento Box */}
        <div className="note-composer notes-bento-composer">
          {/* Active Paragraph Reference Quote */}
          {focusedParagraph && !quoteDetached && (
            <div className="notes-referenced-quote-card macos-quote-card">
              <div className="notes-quote-header">
                <span className="notes-quote-badge">
                  <Quote size={11} /> Focused passage
                </span>
                <button
                  type="button"
                  className="notes-detach-quote-btn"
                  onClick={() => setQuoteDetached(true)}
                  title="Detach quote to write a general session thought"
                  aria-label="Detach quote"
                >
                  <X size={12} /> General note
                </button>
              </div>
              <blockquote className="notes-quote-preview">
                {focusedParagraph.text}
              </blockquote>
            </div>
          )}

          {/* Bold Option Formatting Segmented Pill */}
          <div className="notes-format-bar">
            <div className="notes-bold-segmented macos-segmented" role="group" aria-label="Text bold formatting choice">
              <button
                type="button"
                className={`notes-format-pill ${!isBold ? "is-active" : ""}`}
                onClick={() => toggleBoldPreference(false)}
                aria-pressed={!isBold}
              >
                <span>Aa</span> Regular
              </button>
              <button
                type="button"
                className={`notes-format-pill is-bold-pill ${isBold ? "is-active" : ""}`}
                onClick={() => toggleBoldPreference(true)}
                aria-pressed={isBold}
              >
                <Bold size={13} /> Bold Note
              </button>
            </div>

            <div className="notes-bold-indicator">
              {isBold ? (
                <span className="bold-status-tag is-bold">
                  <Sparkles size={11} /> Bold text active
                </span>
              ) : (
                <span className="bold-status-tag">Regular weight</span>
              )}
            </div>
          </div>

          {/* Note Input Textarea */}
          <textarea
            ref={textareaRef}
            className={`notes-textarea macos-scrollable ${isBold ? "is-bold font-bold" : "font-normal"}`}
            value={currentDraft}
            onChange={(event) => {
              if (typeof setDraft === "function") {
                setDraft(event.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isBold
                ? "Capture a bold thought, key insight, or note for this session... (Ctrl+Enter to save)"
                : "Capture a thought, note, or observation for this session... (Ctrl+Enter to save)"
            }
            aria-label="New session note"
            rows={3}
          />

          {/* Composer Footer & Actions */}
          <div className="notes-composer-footer">
            <div className="notes-char-telemetry font-mono">
              <span>{wordCount} words</span>
              <span className="notes-shortcut-hint">
                <kbd>Ctrl+B</kbd> bold • <kbd>Ctrl+↵</kbd> save
              </span>
            </div>

            <button
              type="button"
              className="notes-save-btn"
              onClick={handleSaveNote}
              disabled={!currentDraft.trim()}
              aria-label="Save note to localStorage"
            >
              <Plus size={15} /> Save Note
            </button>
          </div>
        </div>

        {/* Toolbar: Search, Bold Filter, and PDF Export Status */}
        {notes.length > 0 && (
          <div className="notes-toolbar">
            <div className="notes-search-wrapper">
              <Search size={13} className="notes-search-icon" />
              <input
                type="text"
                className="notes-search-input"
                placeholder="Search session notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search session notes"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="notes-search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              type="button"
              className={`notes-view-bold-toggle ${forceAllBold ? "is-active" : ""}`}
              onClick={() => setForceAllBold((b) => !b)}
              title="Force display all notes in bold format"
              aria-pressed={forceAllBold}
            >
              <Bold size={12} />
              <span>All Bold</span>
            </button>
          </div>
        )}

        {/* Saved Notes List (macOS Bento Cards & macOS scrollbars) */}
        <div className="notes-list notes-bento-list macos-scrollable">
          {notes.length === 0 && (
            <div className="empty-notes notes-empty-bento">
              <div className="notes-empty-icon-wrap">
                <MessageSquareText size={26} />
              </div>
              <strong>Your margins are quiet</strong>
              <span>
                Capture quick reflections, memorable sentences, or reading takeaways. Notes are saved directly in your browser&apos;s localStorage and can be exported as a styled PDF notebook.
              </span>
            </div>
          )}

          {notes.length > 0 && filteredNotes.length === 0 && (
            <div className="empty-notes notes-no-results">
              <Search size={22} />
              <strong>No matching notes</strong>
              <span>Try a different search term or clear the filter.</span>
            </div>
          )}

          {filteredNotes.map((note, index) => {
            const isNoteBold = note.bold === true || forceAllBold;
            return (
              <article
                key={note.id}
                className={`notes-card macos-card ${isNoteBold ? "is-bold-card" : ""}`}
                onMouseMove={handleCardMouseMove}
                aria-label={`Note: ${String(note.text ?? "").slice(0, 80)}`}
              >
                {/* Spotlight hover effect element */}
                <div className="notes-card-spotlight" />

                {/* macOS Card Top Window Header & Metadata */}
                <div className="notes-card-meta macos-card-header">
                  <div className="notes-card-tags">
                    {/* Mini macOS Window Traffic Dots */}
                    <div className="macos-card-dots" aria-hidden="true">
                      <span className="macos-card-dot macos-card-dot-red" />
                      <span className="macos-card-dot macos-card-dot-yellow" />
                      <span className="macos-card-dot macos-card-dot-green" />
                    </div>

                    <span className="notes-card-index font-mono">
                      #{index + 1}
                    </span>

                    <span
                      className={`notes-card-bold-tag ${note.bold ? "is-bold" : "is-reg"}`}
                    >
                      {note.bold ? (
                        <>
                          <Bold size={10} /> BOLD
                        </>
                      ) : (
                        "REGULAR"
                      )}
                    </span>
                    <time className="notes-card-time font-mono">
                      <Clock size={10} /> {formatTimestamp(note.createdAt)}
                    </time>
                  </div>

                  {/* Card Actions: Toggle Bold, Copy, Delete */}
                  <div className="notes-card-actions">
                    <button
                      type="button"
                      className={`notes-micro-btn ${note.bold ? "is-active-bold" : ""}`}
                      onClick={() => toggleNoteBold(note.id)}
                      aria-label={note.bold ? "Change to regular text" : "Change to bold text"}
                      title={note.bold ? "Bold text (click to make regular)" : "Regular text (click to make bold)"}
                    >
                      <Bold size={12} />
                    </button>
                    <button
                      type="button"
                      className="notes-micro-btn"
                      onClick={() => handleCopyNote(note)}
                      aria-label="Copy note to clipboard"
                      title="Copy note text"
                    >
                      {copiedId === note.id ? (
                        <Check size={12} className="notes-check-copied" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                    <button
                      type="button"
                      className="notes-micro-btn notes-delete-btn"
                      onClick={() => handleDeleteNote(note.id)}
                      aria-label={`Delete note: ${String(note.text ?? "").slice(0, 80)}`}
                      title="Delete note"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Quoted Passage Snippet (Apple Books / Kindle notebook style) */}
                {note.quote && (
                  <blockquote className="notes-card-quote macos-quote">
                    <Quote size={10} className="notes-card-quote-icon" />
                    <span>{note.quote}</span>
                  </blockquote>
                )}

                {/* Note Body Text (Bold typography maintained) */}
                <p
                  className={`notes-card-text ${isNoteBold ? "font-bold text-slate-100" : "font-normal"}`}
                >
                  {note.text}
                </p>
              </article>
            );
          })}
        </div>
      </aside>
    </>
  );
}
