import React from "react";
import {
  Command,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  X,
} from "lucide-react";
import { Brand } from "../../../shared/components/index.js";

export function ReaderHeader({
  book,
  sidebarOpen,
  setSidebarOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
  notesOpen,
  setNotesOpen,
  settingsOpen,
  setSettingsOpen,
  notes,
  safeProgress,
  readerStatus,
  safeChapterLabel,
  closeBook,
  navigatorButtonRef,
  notesButtonRef,
  settingsButtonRef,
  progressLabel,
  progressDisplay = "percent",
  onOpenCommands,
  commandsButtonRef,
}) {
  const navigatorLabel = sidebarCollapsed
    ? "Show navigator"
    : "Hide navigator for focused reading";

  // Percent stays the fallback so a missed prop can never blank the header.
  const safeProgressLabel = typeof progressLabel === 'string' ? progressLabel : `${safeProgress}%`;

  return (
    <header className="reader-topbar">
      <div className="reader-topbar-group reader-topbar-nav">
        <button
          type="button"
          className="icon-button navigator-toggle desktop-only"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={navigatorLabel}
          aria-expanded={!sidebarCollapsed}
          aria-controls="book-navigator"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </button>
        <button
          ref={navigatorButtonRef}
          type="button"
          className="icon-button mobile-only"
          onClick={() => setSidebarOpen(true)}
          aria-label={sidebarOpen ? "Close contents" : "Open contents"}
          aria-haspopup="dialog"
          aria-expanded={sidebarOpen}
          aria-controls="book-navigator"
        >
          <Menu size={20} />
        </button>
        <button
          type="button"
          className="brand-button"
          onClick={closeBook}
          aria-label="Back to Bookflow home"
        >
          <Brand compact />
        </button>
      </div>

      <div className="reader-topbar-group reader-topbar-identity">
        <div className="book-identity">
          <span title={book.title}>{book.title}</span>
          <small>{book.author || `${book.kind} document`}</small>
        </div>
        <div
          className="reader-progress"
          role="progressbar"
          aria-label="Reading progress"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={safeProgress}
        >
          <div>
            <span>{readerStatus}</span>
            <strong>{safeProgressLabel}</strong>
          </div>
          <i><b style={{ width: `${safeProgress}%` }} /></i>
        </div>
        <div className="reader-continue" aria-live="polite">
          <span>Continue</span>
          <strong>{safeChapterLabel}</strong>
        </div>
      </div>

      <div className="reader-topbar-group reader-topbar-tools">
        {onOpenCommands && (
          <button
            ref={commandsButtonRef}
            type="button"
            className="icon-button reader-command-trigger"
            onClick={onOpenCommands}
            aria-label="Open reader commands"
            aria-haspopup="dialog"
            data-progress-display={progressDisplay}
          >
            <Command size={19} />
          </button>
        )}
        <button
          ref={notesButtonRef}
          type="button"
          className={`topbar-action ${notesOpen ? "is-active" : ""}`}
          onClick={() => {
            setNotesOpen((open) => !open);
            setSettingsOpen(false);
          }}
          aria-label={notesOpen ? "Close notes" : "Open notes"}
          aria-haspopup="dialog"
          aria-expanded={notesOpen}
          aria-controls="reader-notes-panel"
        >
          <MessageSquareText size={18} />
          <span>Notes</span>
          {notes.length > 0 && <b>{notes.length}</b>}
        </button>
        <button
          ref={settingsButtonRef}
          type="button"
          className={`icon-button ${settingsOpen ? "is-active" : ""}`}
          onClick={() => {
            setSettingsOpen((open) => !open);
            setNotesOpen(false);
          }}
          aria-label={settingsOpen ? "Close reading settings" : "Reading settings"}
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          aria-controls="reader-settings-panel"
        >
          <Settings2 size={19} />
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={closeBook}
          aria-label="Close book"
        >
          <X size={20} />
        </button>
      </div>
    </header>
  );
}
