import { Menu, MessageSquareText, Settings2, Sparkles, X } from 'lucide-react'
import { Brand } from '../../../shared/components/index.js'
import { ContentsPanel } from './ContentsPanel.jsx'
import { FocusCard } from './FocusCard.jsx'
import { NotesPanel } from './NotesPanel.jsx'
import { SettingsPanel } from './SettingsPanel.jsx'

export function ReaderPage({
  book,
  settings,
  setSettings,
  chapters,
  activeChapter,
  progress,
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
  focusedSentence,
  pinnedId,
  setPinnedId,
  isBookmarked,
  minutes,
  totalWords,
  readerRef,
  closeBook,
  jumpToChapter,
  focusSentence,
  setHoveredId,
  toggleBookmark,
  copyFocusedSentence,
  addNote,
}) {
  return (
    <div className="app-shell" data-theme={settings.theme}>
      <header className="reader-topbar">
        <button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)} aria-label="Open contents"><Menu size={20} /></button>
        <button className="brand-button" onClick={closeBook} aria-label="Back to Bookflow home"><Brand compact /></button>
        <div className="book-identity">
          <span>{book.title}</span>
          <small>{book.author || `${book.kind} document`}</small>
        </div>
        <div className="topbar-progress" aria-label={`${progress}% read`}>
          <span>{progress}%</span>
          <div><i style={{ width: `${progress}%` }} /></div>
        </div>
        <button className={`topbar-action ${notesOpen ? 'is-active' : ''}`} onClick={() => setNotesOpen((open) => !open)}>
          <MessageSquareText size={18} /><span>Notes</span>{notes.length > 0 && <b>{notes.length}</b>}
        </button>
        <button className={`icon-button ${settingsOpen ? 'is-active' : ''}`} onClick={() => setSettingsOpen((open) => !open)} aria-label="Reading settings"><Settings2 size={19} /></button>
        <button className="icon-button" onClick={closeBook} aria-label="Close book"><X size={20} /></button>
      </header>

      <div className="reader-layout">
        <ContentsPanel
          book={book}
          chapters={chapters}
          activeChapter={activeChapter}
          minutes={minutes}
          totalWords={totalWords}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          jumpToChapter={jumpToChapter}
          closeBook={closeBook}
        />

        <main
          ref={readerRef}
          className={`reader-canvas focus-${settings.focus}`}
          style={{ '--reader-size': `${settings.fontSize}px`, '--reader-leading': settings.lineHeight, '--reader-width': `${settings.columnWidth}px` }}
        >
          <div className="focus-rail" aria-hidden="true"><span /></div>
          <article className="reading-column">
            <header className="document-header">
              <div className="document-kind">{book.kind} · {chapters.length} {chapters.length === 1 ? 'section' : 'sections'}</div>
              <h1>{book.title}</h1>
              {book.author && <p>{book.author}</p>}
              <div className="document-stats">
                <span>{totalWords.toLocaleString()} words</span><i />
                <span>{minutes} min read</span><i />
                <span>Saved locally</span>
              </div>
            </header>

            {chapters.map((chapter, chapterIndex) => (
              <section className="reading-section" id={`chapter-${chapterIndex}`} key={`${chapter.title}-${chapterIndex}`}>
                <div className="section-number">{String(chapterIndex + 1).padStart(2, '0')}</div>
                <h2>{chapter.title}</h2>
                {chapter.paragraphs.map((paragraph, paragraphIndex) => (
                  <p key={`${chapterIndex}-${paragraphIndex}`}>
                    {paragraph.sentences.map((sentence) => (
                      <span
                        className={`sentence ${focusId === sentence.id ? 'is-active' : ''} ${bookmarks.includes(sentence.id) ? 'is-bookmarked' : ''}`}
                        data-sentence-id={sentence.id}
                        data-chapter={chapterIndex}
                        key={sentence.id}
                        role="button"
                        tabIndex={0}
                        onMouseEnter={() => setHoveredId(sentence.id)}
                        onMouseLeave={() => setHoveredId('')}
                        onClick={() => focusSentence(sentence.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            focusSentence(sentence.id)
                          }
                        }}
                        aria-pressed={pinnedId === sentence.id}
                        title="Click to hold this sentence in focus"
                      >
                        {sentence.text}{' '}
                      </span>
                    ))}
                  </p>
                ))}
              </section>
            ))}

            <footer className="end-mark">
              <Sparkles size={18} />
              <strong>You reached the end</strong>
              <span>Take the thought that stayed with you.</span>
            </footer>
          </article>
        </main>

        <FocusCard
          focusedSentence={focusedSentence}
          pinnedId={pinnedId}
          isBookmarked={isBookmarked}
          toggleBookmark={toggleBookmark}
          copyFocusedSentence={copyFocusedSentence}
          resumeFlow={() => setPinnedId('')}
        />
        <SettingsPanel settings={settings} setSettings={setSettings} open={settingsOpen} close={() => setSettingsOpen(false)} />
        <NotesPanel
          open={notesOpen}
          close={() => setNotesOpen(false)}
          notes={notes}
          setNotes={setNotes}
          draft={noteDraft}
          setDraft={setNoteDraft}
          addNote={addNote}
          focusedSentence={focusedSentence}
        />
      </div>
    </div>
  )
}
