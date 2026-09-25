import { formatReadingTime } from "../lib/readingTime.js";
import { formatParagraphText } from "../lib/textFormatter.js";
import { HorizonTeaser } from "./HorizonTeaser.jsx";

export function ReaderCanvas({
  readerRef,
  safeSettings,
  isStaticFocusRegion,
  activeParagraphIsLarge,
  isScrolling,
  scrollDirection,
  safeTotalParagraphs,
  focusId,
  book,
  chapters,
  activeChapter,
  minutes,
  totalWords,
  progress,
  windowed,
  winStart,
  winEnd,
  chapterWindow,
  topSentinelRef,
  bottomSentinelRef,
  bookmarks,
  pinnedId,
  focusParagraph,
  jumpToChapter,
  closeBook,
}) {
  return (
    <>
      <div
        className={`focus-rail focus-rail-${safeSettings.focus} ${isStaticFocusRegion ? "is-dimmed" : ""}`}
        aria-hidden="true"
      >
        <span key={focusId || "idle"} />
        <i />
      </div>

      <main
        id="main-content"
        data-modal-fallback-focus
        ref={readerRef}
        className={`reader-canvas focus-${safeSettings.focus} reader-mode-${safeSettings.mode} ${activeParagraphIsLarge ? "has-large-selection" : ""} ${isStaticFocusRegion ? "is-over-static" : ""} ${isScrolling ? "is-scrolling" : ""}`}
        data-scroll-direction={scrollDirection}
        data-font={safeSettings.fontFamily}
        data-letter-spacing={safeSettings.letterSpacing}
        data-bionic={safeSettings.bionic ? "true" : "false"}
        data-total-paragraphs={safeTotalParagraphs || undefined}
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
              <div
                ref={topSentinelRef}
                className="chapter-sentinel chapter-sentinel-sink"
                aria-hidden="true"
              />
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
                        data-paragraph-id={chapter.focusEligible ? paragraph.id : undefined}
                        data-chapter={chapter.focusEligible ? chapterIndex : undefined}
                        data-paragraph-index={
                          chapter.focusEligible ? paragraph.globalIndex : undefined
                        }
                        data-total-paragraphs={
                          chapter.focusEligible ? paragraph.totalParagraphs : undefined
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
                          chapter.focusEligible ? pinnedId === paragraph.id : undefined
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
              <div
                ref={bottomSentinelRef}
                className="chapter-sentinel chapter-sentinel-rise"
                aria-hidden="true"
              />
            </div>
          )}

          <footer className="end-mark">
            <strong>You reached the end</strong>
            <span>Take the thought that stayed with you.</span>
            <button type="button" className="end-mark-action" onClick={closeBook}>
              Open another book
            </button>
          </footer>
        </article>
      </main>
    </>
  );
}
