import { Menu, MessageSquareText, Settings2, X } from "lucide-react";
import { Brand } from "../../../shared/components/index.js";
import { ContentsPanel } from "./ContentsPanel.jsx";
import { FocusCard } from "./FocusCard.jsx";
import { NotesPanel } from "./NotesPanel.jsx";
import { SettingsPanel } from "./SettingsPanel.jsx";
import { formatReadingTime } from "../lib/readingTime.js";

export function ReaderPage({
  book,
  settings,
  setSettings,
  chapters,
  activeChapter,
  notes,
  setNotes,
  bookmarks,
  noteDraft,
  setNoteDraft,
  sidebarOpen,
  setSidebarOpen,
  notesOpen,
  setNotesOpen,
  settingsOpen,
  setSettingsOpen,
  focusId,
  focusedParagraph,
  pinnedId,
  isBookmarked,
  minutes,
  totalWords,
  progress,
  readerState,
  activeParagraphIsLarge,
  overStaticRegion,
  staticRegionLabel,
  readerRef,
  closeBook,
  jumpToChapter,
  focusParagraph,
  toggleBookmark,
  copyFocusedParagraph,
  addNote,
  resumeFlow,
}) {
  const isStaticFocusRegion = settings.mode === "focus" && overStaticRegion;
  const readerStatus = {
    focused: "In focus",
    transitioning: "Moving",
    snapping: "Aligning",
    skimming: "Skimming",
    paused: "Held",
    reading: "Reading",
  }[readerState] ?? "Reading";

  return (
    <div
      className="app-shell"
      data-theme={settings.theme}
      data-reader-mode={settings.mode}
      data-reader-state={readerState}
    >
      <header className="reader-topbar">
        <button
          className="icon-button mobile-only"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open contents"
          aria-expanded={sidebarOpen}
        >
          <Menu size={20} />
        </button>
        <button
          className="brand-button"
          onClick={closeBook}
          aria-label="Back to Bookflow home"
        >
          <Brand compact />
        </button>
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
          aria-valuenow={Math.round(progress)}
        >
          <div>
            <span>{readerStatus}</span>
            <strong>{Math.round(progress)}%</strong>
          </div>
          <i><b style={{ width: `${progress}%` }} /></i>
        </div>
        <button
          className={`topbar-action ${notesOpen ? "is-active" : ""}`}
          onClick={() => {
            setNotesOpen((open) => !open);
            setSettingsOpen(false);
          }}
          aria-label="Open notes"
          aria-expanded={notesOpen}
        >
          <MessageSquareText size={18} />
          <span>Notes</span>
          {notes.length > 0 && <b>{notes.length}</b>}
        </button>
        <button
          className={`icon-button ${settingsOpen ? "is-active" : ""}`}
          onClick={() => {
            setSettingsOpen((open) => !open);
            setNotesOpen(false);
          }}
          aria-label="Reading settings"
          aria-expanded={settingsOpen}
        >
          <Settings2 size={19} />
        </button>
        <button
          className="icon-button"
          onClick={closeBook}
          aria-label="Close book"
        >
          <X size={20} />
        </button>
      </header>

      <div
        className={`reader-layout ${settingsOpen || notesOpen ? "has-reader-panel" : ""} ${settingsOpen ? "has-settings-panel" : ""} ${notesOpen ? "has-notes-panel" : ""}`}
      >
        <ContentsPanel
          book={book}
          chapters={chapters}
          activeChapter={activeChapter}
          minutes={minutes}
          bookmarkCount={bookmarks.length}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          jumpToChapter={jumpToChapter}
          closeBook={closeBook}
        />

        <div
          className={`focus-rail focus-rail-${settings.focus} ${isStaticFocusRegion ? "is-dimmed" : ""}`}
          aria-hidden="true"
        >
          <span key={focusId || "idle"} />
          <i />
        </div>

        <main
          ref={readerRef}
          className={`reader-canvas focus-${settings.focus} reader-mode-${settings.mode} ${activeParagraphIsLarge ? "has-large-selection" : ""} ${isStaticFocusRegion ? "is-over-static" : ""}`}
          style={{
            "--reader-size": `${settings.fontSize}px`,
            "--reader-leading": settings.lineHeight,
            "--reader-width": `${settings.columnWidth}px`,
          }}
          tabIndex={0}
          aria-label={`${settings.mode === "focus" ? "Paragraph focus reading" : "Normal reading"}: ${book.title}`}
        >
          <article className="reading-column">
            <header className="document-header">
              <div className="document-kind">
                {book.kind} | {chapters.length}{" "}
                {chapters.length === 1 ? "section" : "sections"}
              </div>
              <h1>{book.title}</h1>
              {book.author && <p>{book.author}</p>}
              <div className="document-stats">
                <span>{totalWords.toLocaleString()} words</span>
                <i />
                <span>{formatReadingTime(minutes)} read</span>
                <i />
                <span>Saved locally</span>
              </div>
            </header>

            {chapters.map((chapter, chapterIndex) => (
              <section
                className={`reading-section ${chapter.focusEligible ? "is-focus-section" : "is-static-section"}`}
                data-focus-eligible={chapter.focusEligible}
                data-chapter-index={chapterIndex}
                id={`chapter-${chapterIndex}`}
                key={`${chapter.title}-${chapterIndex}`}
              >
                <div className="section-number">
                  <span>{book.kind === "PDF" ? "Page" : "Section"}</span>{" "}
                  {String(chapterIndex + 1).padStart(2, "0")}
                </div>
                <h2>{chapter.title}</h2>
                {chapter.sections.map((section, sectionIndex) => (
                  <div
                    className="reading-subsection"
                    key={`${chapter.title}-${section.title ?? "leading"}-${sectionIndex}`}
                  >
                    {section.title && <h3>{section.title}</h3>}
                    {section.paragraphs.map((paragraph) => (
                      <p
                        className={`${chapter.focusEligible ? "reading-paragraph" : "reading-paragraph-static"} ${focusId === paragraph.id ? "is-active" : ""} ${bookmarks.includes(paragraph.id) ? "is-bookmarked" : ""}`}
                        data-paragraph-id={
                          chapter.focusEligible ? paragraph.id : undefined
                        }
                        data-chapter={
                          chapter.focusEligible ? chapterIndex : undefined
                        }
                        key={paragraph.id}
                        role={chapter.focusEligible ? "button" : undefined}
                        tabIndex={chapter.focusEligible ? 0 : undefined}
                        onClick={
                          chapter.focusEligible
                            ? () => focusParagraph(paragraph.id)
                            : undefined
                        }
                        onKeyDown={
                          chapter.focusEligible
                            ? (event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  focusParagraph(paragraph.id);
                                }
                              }
                            : undefined
                        }
                        aria-current={focusId === paragraph.id ? "true" : undefined}
                        aria-pressed={
                          chapter.focusEligible
                            ? pinnedId === paragraph.id
                            : undefined
                        }
                        title={
                          chapter.focusEligible
                            ? "Select this paragraph and hold it in focus"
                            : undefined
                        }
                      >
                        {paragraph.text}
                      </p>
                    ))}
                  </div>
                ))}
              </section>
            ))}

            <footer className="end-mark">
              <strong>You reached the end</strong>
              <span>Take the thought that stayed with you.</span>
            </footer>
          </article>
        </main>

        {isStaticFocusRegion ? (
          <div className="static-region-label" role="status">
            {staticRegionLabel}
          </div>
        ) : (
          <FocusCard
            focusedParagraph={focusedParagraph}
            pinnedId={pinnedId}
            isBookmarked={isBookmarked}
            toggleBookmark={toggleBookmark}
            copyFocusedParagraph={copyFocusedParagraph}
            resumeFlow={resumeFlow}
          />
        )}
        <SettingsPanel
          settings={settings}
          setSettings={setSettings}
          open={settingsOpen}
          close={() => setSettingsOpen(false)}
        />
        <NotesPanel
          open={notesOpen}
          close={() => setNotesOpen(false)}
          notes={notes}
          setNotes={setNotes}
          draft={noteDraft}
          setDraft={setNoteDraft}
          addNote={addNote}
          focusedParagraph={focusedParagraph}
        />
      </div>
    </div>
  );
}
