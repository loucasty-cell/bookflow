import { Library, Plus, X } from "lucide-react";
import bookflowArtwork from "../../../assets/bookflow-quill.png";
import { formatReadingTime } from "../lib/readingTime.js";

export function ContentsPanel({
  book,
  chapters,
  activeChapter,
  minutes,
  bookmarkCount,
  sidebarOpen,
  setSidebarOpen,
  jumpToChapter,
  closeBook,
}) {
  return (
    <>
      <aside className={`contents-panel ${sidebarOpen ? "is-open" : ""}`}>
        <div className="contents-shell">
          <div className="panel-heading">
            <span>
              <Library size={16} /> Navigator
            </span>
            <button
              className="icon-button mobile-only"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigator"
            >
              <X size={18} />
            </button>
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

          <nav className="contents-list" aria-label="Chapter navigation">
            {chapters.map((chapter, index) => (
              <button
                key={`${chapter.title}-${index}`}
                className={`contents-item ${activeChapter === index ? "is-active" : ""}`}
                onClick={() => {
                  jumpToChapter(index);
                  setSidebarOpen(false);
                }}
              >
                <div>
                  <span>{index + 1}</span>
                  <strong title={chapter.title}>{chapter.title}</strong>
                </div>
                <small>{chapter.paragraphs.length} paragraphs</small>
              </button>
            ))}
          </nav>

          <div className="contents-actions">
            <button className="contents-action-button" onClick={closeBook}>
              <Plus size={16} />
              <span>Open another book</span>
            </button>
          </div>
        </div>
      </aside>
      {sidebarOpen && (
        <button
          className="mobile-scrim"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigator"
        />
      )}
    </>
  );
}
