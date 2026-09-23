import { useEffect, useRef } from "react";
import {
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  X,
} from "lucide-react";
import { Brand, ErrorBoundary } from "../../../shared/components/index.js";
import { DEFAULT_SETTINGS } from "../config.js";
import { ContentsPanel } from "./ContentsPanel.jsx";
import { FocusCard } from "./FocusCard.jsx";
import { NotesPanel } from "./NotesPanel.jsx";
import { SettingsPanel } from "./SettingsPanel.jsx";
import { SelectionTooltip } from "./SelectionTooltip.jsx";
import { formatReadingTime } from "../lib/readingTime.js";
import { useScrollPosition } from "../lib/useScrollPosition.js";
import { formatParagraphText } from "../lib/textFormatter.js";
import { HorizonTeaser } from "./HorizonTeaser.jsx";

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
  sidebarCollapsed,
  setSidebarCollapsed,
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
  moveFocus,
  addNote,
  resumeFlow,
  chapterWindow = null,
}) {
  const safeSettings = {
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
  };
  const { isScrolling, direction: scrollDirection } = useScrollPosition(readerRef, {
    disabled: !book,
  });
  const isStaticFocusRegion = safeSettings.mode === "focus" && overStaticRegion;
  const safeProgress = Number.isFinite(progress) ? Math.min(100, Math.max(0, Math.round(progress))) : 0;
  const safeChapters = Array.isArray(chapters) ? chapters : [];
  const safeChapterLabel = safeChapters.length ? `${activeChapter + 1} / ${safeChapters.length}` : "–";

  const windowed = chapterWindow?.windowed === true;
  const winStart = windowed ? chapterWindow.winStart : 0;
  const winEnd = windowed ? chapterWindow.winEnd : safeChapters.length - 1;
  const topSentinelRef = useRef(null);
  const bottomSentinelRef = useRef(null);
  const prevWinStartRef = useRef(winStart);

  useEffect(() => {
    if (!windowed) return undefined;
    const reader = readerRef?.current;
    if (!reader) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const entries = new Map();
      for (let index = winStart; index <= winEnd; index += 1) {
        const section = reader.querySelector(`#chapter-${index}`);
        if (section) entries.set(index, Math.round(section.offsetHeight));
      }
      chapterWindow.cacheHeights(entries);
    });
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowed, winStart, winEnd, book]);

  useEffect(() => {
    if (!windowed) return undefined;
    const reader = readerRef?.current;
    if (!reader) return undefined;
    if (prevWinStartRef.current === winStart) {
      prevWinStartRef.current = winStart;
      return undefined;
    }
    const previousStart = prevWinStartRef.current;
    prevWinStartRef.current = winStart;
    if (winStart >= previousStart) return undefined;
    const oldHeight = reader.scrollHeight;
    const frame = window.requestAnimationFrame(() => {
      reader.scrollTop += reader.scrollHeight - oldHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [windowed, winStart, readerRef]);

  useEffect(() => {
    if (!windowed) return undefined;
    const pending = chapterWindow.pendingJumpRef?.current;
    if (!pending) return undefined;
    const reader = readerRef?.current;
    if (!reader) return undefined;
    chapterWindow.pendingJumpRef.current = null;
    const frame = window.requestAnimationFrame(() => {
      if (pending.paragraphId) {
        const element = reader.querySelector(`[data-paragraph-id="${pending.paragraphId}"]`);
        if (element) {
          const containerRect = reader.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          reader.scrollTo({
            top: Math.max(0, elementRect.top - containerRect.top + reader.scrollTop - containerRect.height * 0.38 + elementRect.height / 2),
            behavior: "auto",
          });
          return;
        }
      }
      const chapterElement = reader.querySelector(`#chapter-${pending.chapterIndex}`);
      if (chapterElement) {
        const containerRect = reader.getBoundingClientRect();
        const elementRect = chapterElement.getBoundingClientRect();
        reader.scrollTo({
          top: Math.max(0, elementRect.top - containerRect.top + reader.scrollTop),
          behavior: "auto",
        });
      }
    });
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowed, winStart, winEnd]);

  useEffect(() => {
    if (!windowed) return undefined;
    const reader = readerRef?.current;
    const topSentinel = topSentinelRef.current;
    const bottomSentinel = bottomSentinelRef.current;
    if (!reader || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (observed) => {
        for (const entry of observed) {
          if (!entry.isIntersecting) continue;
          if (entry.target === topSentinel) chapterWindow.expandUp();
          else if (entry.target === bottomSentinel) chapterWindow.expandDown();
        }
      },
      { root: reader, rootMargin: "600px 0px" },
    );
    if (topSentinel) observer.observe(topSentinel);
    if (bottomSentinel) observer.observe(bottomSentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowed, winStart, winEnd, readerRef]);
  const readerStatus = {
    focused: "In focus",
    transitioning: "Moving",
    snapping: "Aligning",
    skimming: "Skimming",
    paused: "Held",
    reading: "Reading",
  }[readerState] ?? "Reading";
  const navigatorLabel = sidebarCollapsed
    ? "Show navigator"
    : "Hide navigator for focused reading";

  return (
    <div
      className="app-shell"
      data-theme={safeSettings.theme}
      data-reader-mode={safeSettings.mode}
      data-reader-state={readerState}
    >
      <header className="reader-topbar">
        <button
          className="icon-button navigator-toggle desktop-only"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={navigatorLabel}
          aria-expanded={!sidebarCollapsed}
          aria-controls="book-navigator"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </button>
        <button
          className="icon-button mobile-only"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open contents"
          aria-expanded={sidebarOpen}
          aria-controls="book-navigator"
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
          aria-valuenow={safeProgress}
        >
          <div>
            <span>{readerStatus}</span>
            <strong>{safeProgress}%</strong>
          </div>
          <i><b style={{ width: `${safeProgress}%` }} /></i>
        </div>
        <div className="reader-continue" aria-live="polite">
          <span>Continue</span>
          <strong>{safeChapterLabel}</strong>
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
        className={`reader-layout ${sidebarCollapsed ? "is-sidebar-collapsed" : ""} ${settingsOpen || notesOpen ? "has-reader-panel" : ""} ${settingsOpen ? "has-settings-panel" : ""} ${notesOpen ? "has-notes-panel" : ""}`}
      >
        <ContentsPanel
          book={book}
          chapters={chapters}
          activeChapter={activeChapter}
          minutes={minutes}
          bookmarkCount={bookmarks.length}
          progress={progress}
          sidebarOpen={sidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarOpen={setSidebarOpen}
          setSidebarCollapsed={setSidebarCollapsed}
          jumpToChapter={jumpToChapter}
          closeBook={closeBook}
        />

        <div
          className={`focus-rail focus-rail-${safeSettings.focus} ${isStaticFocusRegion ? "is-dimmed" : ""}`}
          aria-hidden="true"
        >
          <span key={focusId || "idle"} />
          <i />
        </div>

        <main
          ref={readerRef}
          className={`reader-canvas focus-${safeSettings.focus} reader-mode-${safeSettings.mode} ${activeParagraphIsLarge ? "has-large-selection" : ""} ${isStaticFocusRegion ? "is-over-static" : ""} ${isScrolling ? "is-scrolling" : ""}`}
          data-scroll-direction={scrollDirection}
          data-font={safeSettings.fontFamily}
          data-letter-spacing={safeSettings.letterSpacing}
          data-bionic={safeSettings.bionic ? "true" : "false"}
          style={{
            "--reader-size": `${safeSettings.fontSize}px`,
            "--reader-leading": safeSettings.lineHeight,
            "--reader-width": `${safeSettings.columnWidth}px`,
          }}
          tabIndex={0}
          aria-label={`${safeSettings.mode === "focus" ? "Paragraph focus reading" : "Normal reading"}: ${book.title}`}
          aria-keyshortcuts={safeSettings.mode === "focus" ? "ArrowDown ArrowUp Space Escape" : undefined}
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

              <div className="document-continue">
                <span>Continue reading</span>
                <strong>{chapters[activeChapter]?.title ?? "Your next chapter"}</strong>
                <small>{Math.round(progress)}% through this book</small>
              </div>
            </header>

            {windowed && chapterWindow.topSpacer > 0 && (
              <div
                className="chapter-spacer"
                style={{ height: `${chapterWindow.topSpacer}px` }}
                aria-hidden="true"
              >
                <div ref={topSentinelRef} className="chapter-sentinel chapter-sentinel-sink" aria-hidden="true" />
              </div>
            )}
            {chapters.map((chapter, chapterIndex) => {
              if (windowed && (chapterIndex < winStart || chapterIndex > winEnd)) return null;
              return (
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
                        aria-keyshortcuts={chapter.focusEligible ? "Enter Space" : undefined}
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
                        {formatParagraphText(paragraph.text, { bionic: safeSettings.bionic })}
                      </p>
                    ))}
                  </div>
                ))}

                {chapter.focusEligible && chapterIndex < chapters.length - 1 && (
                  <HorizonTeaser
                    nextChapter={chapters[chapterIndex + 1]}
                    onJumpToNext={() => jumpToChapter(chapterIndex + 1)}
                  />
                )}
              </section>
              );
            })}
            {windowed && chapterWindow.bottomSpacer > 0 && (
              <div
                className="chapter-spacer"
                style={{ height: `${chapterWindow.bottomSpacer}px` }}
                aria-hidden="true"
              >
                <div ref={bottomSentinelRef} className="chapter-sentinel chapter-sentinel-rise" aria-hidden="true" />
              </div>
            )}

            <footer className="end-mark">
              <strong>You reached the end</strong>
              <span>Take the thought that stayed with you.</span>
              <button className="end-mark-action" onClick={closeBook}>
                Open another book
              </button>
            </footer>
          </article>
        </main>

        {isStaticFocusRegion ? (
          <div className="static-region-label" role="status">
            {staticRegionLabel}
          </div>
        ) : (
          <ErrorBoundary>
            <FocusCard
              focusedParagraph={focusedParagraph}
              pinnedId={pinnedId}
              isBookmarked={isBookmarked}
              toggleBookmark={toggleBookmark}
              copyFocusedParagraph={copyFocusedParagraph}
              moveFocus={moveFocus}
              resumeFlow={resumeFlow}
            />
          </ErrorBoundary>
        )}
        <ErrorBoundary>
          <SettingsPanel
            settings={settings}
            setSettings={setSettings}
            open={settingsOpen}
            close={() => setSettingsOpen(false)}
          />
        </ErrorBoundary>
        <ErrorBoundary>
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
        </ErrorBoundary>
        <SelectionTooltip
          containerRef={readerRef}
          onAddNoteFromSelection={(text) => {
            setNoteDraft(text);
            setNotesOpen(true);
          }}
          onBookmarkParagraph={toggleBookmark}
          activeParagraphId={focusId}
          lookupEnabled={safeSettings.showDefinitionLookup === true}
        />
      </div>
    </div>
  );
}
