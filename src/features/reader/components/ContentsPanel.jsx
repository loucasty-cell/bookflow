import { BookOpen, Clock3, FileText, Library, Plus, X } from 'lucide-react'

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
        <nav className="chapter-list" aria-label="Book contents">
          {chapters.map((chapter, index) => (
            <button key={`${chapter.title}-${index}`} className={activeChapter === index ? 'active' : ''} onClick={() => jumpToChapter(index)}>
              <span>{String(index + 1).padStart(2, '0')}</span><b>{chapter.title}</b>
            </button>
          ))}
        </nav>
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
