import { Menu, MessageSquareText, Settings2, X } from "lucide-react";
import { Brand } from "../../../shared/components/index.js";
import { ContentsPanel } from "./ContentsPanel.jsx";
import { FocusCard } from "./FocusCard.jsx";
import { NotesPanel } from "./NotesPanel.jsx";
import { SettingsPanel } from "./SettingsPanel.jsx";

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
  readerRef,
  showCelebration,
  dismissCelebration,
  closeBook,
  jumpToChapter,
  focusParagraph,
  toggleBookmark,
  copyFocusedParagraph,
  addNote,
  resumeFlow,
  navigateBy,
}) {
  return (
    <div
      className="app-shell"
      data-theme={settings.theme}
      data-reader-mode={settings.mode}
    >
      <header className="reader-topbar">
        <button
          className="icon-button mobile-only"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open contents"
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
          <span>{book.title}</span>
          <small>{book.author || `${book.kind} document`}</small>
        </div>
        <button
          className={`topbar-action ${notesOpen ? "is-active" : ""}`}
          onClick={() => setNotesOpen((open) => !open)}
          aria-label="Open notes"
        >
          <MessageSquareText size={18} />
          <span>Notes</span>
          {notes.length > 0 && <b>{notes.length}</b>}
        </button>
        <button
          className={`icon-button ${settingsOpen ? "is-active" : ""}`}
          onClick={() => setSettingsOpen((open) => !open)}
          aria-label="Reading settings"
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

      <div className="reader-layout">
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
          className={`focus-rail focus-rail-${settings.focus}`}
          aria-hidden="true"
        >
          <span key={focusId || "idle"} />
          <i />
        </div>

        <main
          ref={readerRef}
          className={`reader-canvas focus-${settings.focus} reader-mode-${settings.mode}`}
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
                <span>{minutes} min read</span>
                <i />
                <span>Saved locally</span>
              </div>
            </header>

            {chapters.map((chapter, chapterIndex) => (
              <section
                className={`reading-section ${chapter.focusEligible ? "is-focus-section" : "is-static-section"}`}
                data-focus-eligible={chapter.focusEligible}
                id={`chapter-${chapterIndex}`}
                key={`${chapter.title}-${chapterIndex}`}
              >
                <div className="section-number">
                  {String(chapterIndex + 1).padStart(2, "0")}
                </div>
                <h2>{chapter.title}</h2>
                {chapter.paragraphs.map((paragraph) => (
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
              </section>
            ))}

            <footer className="end-mark">
              <strong>You reached the end</strong>
              <span>Take the thought that stayed with you.</span>
            </footer>
          </article>
        </main>

        {showCelebration ? (
          <div className="celebration-banner" role="status" aria-live="polite">
            <div className="celebration-content">
              <strong>15 pages read!</strong>
              <p>
                Nice work keeping the rhythm. Keep going with one more warm
                paragraph.
              </p>
              <button onClick={dismissCelebration} type="button">
                Celebrate
              </button>
            </div>
          </div>
        ) : null}

        <FocusCard
          focusedParagraph={focusedParagraph}
          pinnedId={pinnedId}
          isBookmarked={isBookmarked}
          toggleBookmark={toggleBookmark}
          copyFocusedParagraph={copyFocusedParagraph}
          resumeFlow={resumeFlow}
        />
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
