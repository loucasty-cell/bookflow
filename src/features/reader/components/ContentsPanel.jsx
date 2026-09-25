import { useEffect, useRef, useState } from "react";
import { Library, PanelLeftClose, Plus, X } from "lucide-react";
import { useModalFocus } from "../../../shared/lib/index.js";
// TODO(backlog-10): build LookBackPanel (chapter + heading map with current
// position marked) reusing this chapter data, no new parsing. Never a 3D
// page-flip, never animate the reading column. Looking back is a core failure
// mode of scroll readers; this panel is the fix.
import bookflowArtwork from "../../../assets/bookflow-quill.png";
import { formatReadingTime } from "../lib/readingTime.js";

function safeProgressValue(progress) {
  return Number.isFinite(progress) ? Math.min(100, Math.max(0, Math.round(progress))) : 0;
}

export function ContentsPanel({
  book,
  chapters,
  activeChapter,
  minutes,
  bookmarkCount,
  progress,
  sidebarOpen,
  sidebarCollapsed,
  setSidebarOpen,
  setSidebarCollapsed,
  jumpToChapter,
  closeBook,
  returnFocusRef,
}) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia?.("(max-width: 900px)").matches,
  );
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);
  const mobileDialogOpen = isMobile && sidebarOpen;
  const navigatorHidden = isMobile ? !sidebarOpen : sidebarCollapsed;

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(max-width: 900px)");
    if (!mediaQuery) return undefined;
    const handleChange = (event) => setIsMobile(event.matches);
    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener?.("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, []);

  useEffect(() => {
    if (!navigatorHidden || !panelRef.current?.contains(document.activeElement)) return;
    const fallback = document.querySelector(
      isMobile ? ".reader-topbar .mobile-only" : ".navigator-toggle",
    );
    if (fallback && typeof fallback.focus === "function") fallback.focus();
  }, [isMobile, navigatorHidden]);

  useModalFocus({
    open: mobileDialogOpen,
    containerRef: panelRef,
    onClose: () => setSidebarOpen(false),
    initialFocusRef: closeButtonRef,
    returnFocusRef,
  });

  return (
    <>
      <aside
        ref={panelRef}
        id="book-navigator"
        className={`contents-panel ${sidebarOpen ? "is-open" : ""} ${sidebarCollapsed ? "is-collapsed" : ""}`}
        role={mobileDialogOpen ? "dialog" : undefined}
        aria-modal={mobileDialogOpen ? "true" : undefined}
        aria-labelledby={mobileDialogOpen ? "book-navigator-title" : undefined}
        aria-hidden={navigatorHidden ? true : undefined}
        inert={navigatorHidden ? true : undefined}
        tabIndex={mobileDialogOpen ? -1 : undefined}
        aria-label={mobileDialogOpen ? undefined : "Book navigator"}
      >
        <div className="contents-shell">
          <div className="panel-heading macos-panel-heading">
            <div className="macos-traffic-lights" aria-hidden="true">
              <span className="traffic-dot traffic-close" />
              <span className="traffic-dot traffic-minimize" />
              <span className="traffic-dot traffic-maximize" />
            </div>
            <span id="book-navigator-title" className="navigator-title">
              <Library size={15} /> Navigator
            </span>
            <div className="navigator-heading-actions">
              <button
                type="button"
                className="icon-button desktop-only contents-collapse-button"
                onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
                aria-label="Toggle navigator for focused reading"
              >
                <PanelLeftClose size={18} />
              </button>
              <button
                ref={closeButtonRef}
                type="button"
                className="icon-button mobile-only"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close navigator"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="book-miniature">
            <div className="mini-cover">
              <img src={bookflowArtwork} alt="" />
            </div>
            <div className="book-miniature-copy">
              <strong title={book.title}>{book.title}</strong>
              <span>{book.author || book.kind}</span>
            </div>
          </div>

          <div className="contents-stats">
            <div>
              <strong>{chapters.length}</strong>
              <span>Sections</span>
            </div>
            <div>
              <strong>{bookmarkCount}</strong>
              <span>Bookmarks</span>
            </div>
            <div>
              <strong>{formatReadingTime(minutes)}</strong>
              <span>Read time</span>
            </div>
          </div>

          <div className="contents-continue" aria-label={`Continue reading at ${safeProgressValue(progress)} percent`}>
            <div>
              <span>Continue reading</span>
              <strong>{safeProgressValue(progress)}%</strong>
            </div>
            <i><b style={{ width: `${safeProgressValue(progress)}%` }} /></i>
            <small>{chapters[activeChapter]?.title ?? "Start at the beginning"}</small>
          </div>
          <div className="contents-category-header">
            <span>Sections</span>
            <small>{chapters.length}</small>
          </div>
          <nav className="contents-list" aria-label="Chapter navigation">
            {chapters.map((chapter, index) => (
              <button
                type="button"
                key={`${chapter.title}-${index}`}
                className={`contents-item ${activeChapter === index ? "is-active" : ""}`}
                onClick={() => {
                  jumpToChapter(index);
                  setSidebarOpen(false);
                }}
                aria-current={activeChapter === index ? "page" : undefined}
              >
                <div className="contents-item-leading">
                  <span className="contents-item-index">{index + 1}</span>
                  <strong title={chapter.title}>{chapter.title}</strong>
                </div>
                <small className="contents-item-detail">
                  {chapter.paragraphs.length} {chapter.paragraphs.length === 1 ? "paragraph" : "paragraphs"}
                </small>
              </button>
            ))}
          </nav>

          <div className="contents-actions">
            <button type="button" className="contents-action-button" onClick={closeBook}>
              <Plus size={16} />
              <span>Open another book</span>
            </button>
          </div>
        </div>
      </aside>
      {sidebarOpen && (
        <div
          className="mobile-scrim"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
