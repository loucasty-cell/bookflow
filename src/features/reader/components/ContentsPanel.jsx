import { BookOpen, ChevronDown, ChevronUp, Clock3, FileText, Library, Plus, X } from 'lucide-react'

export function ContentsPanel({ book, chapters, activeChapter, minutes, totalWords, sidebarOpen, setSidebarOpen, jumpToChapter, closeBook }) {
  return (
    <>
      <aside className={`contents-panel ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="panel-heading">
          <span><Library size={16} /> Contents</span>
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Close contents"><X size={18} /></button>
        </div>
        <div className="book-miniature">
          <div className="mini-cover"><BookOpen size={28} /></div>
          <div><strong>{book.title}</strong><span>{book.author || book.kind}</span></div>
        </div>
        <div className="page-navigator" aria-label="Page navigation">
          <div className="page-fraction">
            <strong>{activeChapter + 1}</strong>
            <span>/ {chapters.length}</span>
          </div>
          <div className="page-context">
            <span>Current page</span>
            <strong>{chapters[activeChapter]?.title || `Page ${activeChapter + 1}`}</strong>
          </div>
          <input
            type="range"
            min="0"
            max={Math.max(0, chapters.length - 1)}
            value={activeChapter}
            onChange={(event) => jumpToChapter(Number(event.target.value))}
            aria-label={`Go to page ${activeChapter + 1} of ${chapters.length}`}
          />
          <div className="page-stepper">
            <button onClick={() => jumpToChapter(activeChapter - 1)} disabled={activeChapter === 0} aria-label="Previous page"><ChevronUp size={15} /> Previous</button>
            <button onClick={() => jumpToChapter(activeChapter + 1)} disabled={activeChapter === chapters.length - 1} aria-label="Next page">Next <ChevronDown size={15} /></button>
          </div>
        </div>
        <div className="side-stats">
          <div><Clock3 size={15} /><span><strong>{minutes} min</strong> remaining at a relaxed pace</span></div>
          <div><FileText size={15} /><span><strong>{totalWords.toLocaleString()}</strong> words across {chapters.length} sections</span></div>
        </div>
        <button className="import-another" onClick={closeBook}><Plus size={16} /> Open another book</button>
      </aside>
      {sidebarOpen && <button className="mobile-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close contents" />}
    </>
  )
}
