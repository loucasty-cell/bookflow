import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  FileText,
  Focus,
  Highlighter,
  Library,
  Menu,
  MessageSquareText,
  Moon,
  MoreHorizontal,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  UploadCloud,
  X,
} from 'lucide-react'
import { ACCEPTED_FILES, parseDocument } from './lib/documentParsers.js'
import { documentId, splitSentences, wordCount } from './lib/text.js'

const SAMPLE_BOOK = {
  title: 'The Art of Staying Curious',
  author: 'A Bookflow sample',
  kind: 'SAMPLE',
  chapters: [
    {
      title: 'Begin with wonder',
      paragraphs: [
        'Curiosity rarely arrives with a grand announcement. More often, it begins as a quiet pause before an ordinary thing: a question about the street you walk each morning, the work you repeat, or the person you think you already know.',
        'A curious mind does not need every answer at once. It only needs permission to notice. Attention turns familiar moments into open doors, and each door makes the world feel a little larger.',
      ],
    },
    {
      title: 'Read at the speed of thought',
      paragraphs: [
        'Reading is not a race across pages. The useful pace is the one that lets an idea meet your own experience. Some sentences ask to be carried quickly, while others deserve a place to rest.',
        'When attention drifts, return to one complete sentence. Let its shape become clear before moving on. A gentle rhythm is more sustainable than forcing concentration, because ease gives the mind room to stay.',
      ],
    },
    {
      title: 'Keep the question alive',
      paragraphs: [
        'The best books continue after the final page. They leave behind a better question, a changed habit of looking, or a phrase that keeps unfolding during the day.',
        'Mark what moves you, but do not collect highlights only to possess them. Revisit one thought and use it. Knowledge becomes memorable when it changes the way you pay attention.',
      ],
    },
  ],
}

const DEFAULT_SETTINGS = {
  fontSize: 20,
  lineHeight: 1.9,
  columnWidth: 720,
  focus: 'soft',
  theme: 'paper',
}

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function storageKey(id) {
  return `bookflow:document:${id}`
}

function App() {
  const [book, setBook] = useState(null)
  const [bookId, setBookId] = useState('')
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...safeParse(localStorage.getItem('bookflow:settings'), {}),
  }))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [activeId, setActiveId] = useState('')
  const [hoveredId, setHoveredId] = useState('')
  const [pinnedId, setPinnedId] = useState('')
  const [activeChapter, setActiveChapter] = useState(0)
  const [progress, setProgress] = useState(0)
  const [notes, setNotes] = useState([])
  const [bookmarks, setBookmarks] = useState([])
  const [noteDraft, setNoteDraft] = useState('')
  const fileInputRef = useRef(null)
  const readerRef = useRef(null)
  const restoreScrollRef = useRef(0)
  const frameRef = useRef(null)

  const chapters = useMemo(() => {
    if (!book) return []
    return book.chapters.map((chapter, chapterIndex) => ({
      ...chapter,
      paragraphs: chapter.paragraphs.map((paragraph, paragraphIndex) => ({
        text: paragraph,
        sentences: splitSentences(paragraph).map((text, sentenceIndex) => ({
          id: `${chapterIndex}-${paragraphIndex}-${sentenceIndex}`,
          text,
          chapterIndex,
        })),
      })),
    }))
  }, [book])

  const sentenceMap = useMemo(() => {
    const entries = chapters.flatMap((chapter) => chapter.paragraphs.flatMap((paragraph) => paragraph.sentences))
    return new Map(entries.map((sentence) => [sentence.id, sentence]))
  }, [chapters])

  const totalWords = useMemo(
    () => book?.chapters.reduce((total, chapter) => total + wordCount(chapter.paragraphs.join(' ')), 0) ?? 0,
    [book],
  )
  const minutes = Math.max(1, Math.ceil(totalWords / 230))
  const focusId = hoveredId || pinnedId || activeId
  const focusedSentence = sentenceMap.get(focusId)
  const isBookmarked = focusId ? bookmarks.includes(focusId) : false

  useEffect(() => {
    localStorage.setItem('bookflow:settings', JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    if (!bookId) return
    localStorage.setItem(storageKey(bookId), JSON.stringify({ notes, bookmarks, progress, scrollTop: readerRef.current?.scrollTop ?? 0 }))
  }, [bookId, bookmarks, notes, progress])

  useEffect(() => {
    if (!book || !readerRef.current) return undefined
    const reader = readerRef.current

    const updateReadingPosition = () => {
      if (frameRef.current) return
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null
        const maxScroll = reader.scrollHeight - reader.clientHeight
        const nextProgress = maxScroll > 0 ? Math.min(100, Math.max(0, Math.round((reader.scrollTop / maxScroll) * 100))) : 100
        setProgress(nextProgress)

        if (!pinnedId) {
          const targetY = reader.getBoundingClientRect().top + reader.clientHeight * 0.42
          let nearest = null
          let nearestDistance = Number.POSITIVE_INFINITY
          reader.querySelectorAll('[data-sentence-id]').forEach((element) => {
            const rect = element.getBoundingClientRect()
            if (rect.bottom < reader.getBoundingClientRect().top || rect.top > reader.getBoundingClientRect().bottom) return
            const distance = Math.abs(rect.top + rect.height / 2 - targetY)
            if (distance < nearestDistance) {
              nearestDistance = distance
              nearest = element
            }
          })
          if (nearest) {
            setActiveId(nearest.dataset.sentenceId)
            setActiveChapter(Number(nearest.dataset.chapter))
          }
        }
      })
    }

    reader.addEventListener('scroll', updateReadingPosition, { passive: true })
    const restore = window.setTimeout(() => {
      reader.scrollTop = restoreScrollRef.current
      updateReadingPosition()
    }, 40)

    return () => {
      reader.removeEventListener('scroll', updateReadingPosition)
      window.clearTimeout(restore)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [book, pinnedId])

  const openBook = useCallback((nextBook, id) => {
    const saved = safeParse(localStorage.getItem(storageKey(id)), {})
    restoreScrollRef.current = saved.scrollTop ?? 0
    setBook(nextBook)
    setBookId(id)
    setNotes(saved.notes ?? [])
    setBookmarks(saved.bookmarks ?? [])
    setProgress(saved.progress ?? 0)
    setActiveId('0-0-0')
    setPinnedId('')
    setActiveChapter(0)
    setSidebarOpen(false)
    setError('')
    document.title = `${nextBook.title} — Bookflow`
  }, [])

  const handleFile = useCallback(async (file) => {
    if (!file) return
    setError('')
    setLoading({ name: file.name, percent: 5, label: 'Checking your document' })
    try {
      const parsed = await parseDocument(file, (percent, label) => {
        setLoading({ name: file.name, percent, label })
      })
      openBook(parsed, documentId(file))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Bookflow could not open this document.')
    } finally {
      setLoading(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [openBook])

  const closeBook = () => {
    setBook(null)
    setBookId('')
    setNotesOpen(false)
    setSettingsOpen(false)
    setSidebarOpen(false)
    setPinnedId('')
    document.title = 'Bookflow — Read in your rhythm'
  }

  const jumpToChapter = (index) => {
    document.getElementById(`chapter-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveChapter(index)
    setSidebarOpen(false)
  }

  const focusSentence = (id) => {
    setActiveId(id)
    setPinnedId((current) => (current === id ? '' : id))
  }

  const toggleBookmark = () => {
    if (!focusId) return
    setBookmarks((current) => current.includes(focusId) ? current.filter((id) => id !== focusId) : [...current, focusId])
  }

  const copyFocusedSentence = async () => {
    if (!focusedSentence) return
    await navigator.clipboard.writeText(focusedSentence.text).catch(() => {})
  }

  const addNote = () => {
    const text = noteDraft.trim()
    if (!text) return
    setNotes((current) => [{ id: crypto.randomUUID(), sentenceId: focusId, quote: focusedSentence?.text ?? '', text }, ...current])
    setNoteDraft('')
  }

  if (!book) {
    return (
      <main className="landing-shell">
        <nav className="landing-nav" aria-label="Primary navigation">
          <Brand />
          <div className="nav-trust"><ShieldCheck size={15} /> Private by design</div>
        </nav>

        <section className="hero">
          <div className="eyebrow"><Sparkles size={14} /> A calmer way to read</div>
          <h1>Stay with the sentence.<br /><span>Let the pages flow.</span></h1>
          <p className="hero-copy">
            Turn PDFs and ebooks into a beautifully focused reading space. Bookflow gently follows each complete sentence, so your attention has somewhere comfortable to land.
          </p>

          <div
            className={`drop-card ${dragging ? 'is-dragging' : ''}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false) }}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              handleFile(event.dataTransfer.files[0])
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILES}
              onChange={(event) => handleFile(event.target.files[0])}
              aria-label="Choose a book or document"
            />
            <div className="upload-icon"><UploadCloud size={26} strokeWidth={1.8} /></div>
            <div>
              <strong>{dragging ? 'Release to begin' : 'Drop a book here'}</strong>
              <span>or click to choose a file</span>
            </div>
            <div className="format-row" aria-label="Supported formats">
              <span>PDF</span><span>EPUB</span><span>TXT</span><span>MD</span>
            </div>
          </div>

          <button className="sample-button" onClick={() => openBook(SAMPLE_BOOK, 'bookflow-sample')}>
            <BookOpen size={17} /> Try the reading experience <ChevronRight size={16} />
          </button>

          {error && <div className="error-card" role="alert"><X size={17} /> <span>{error}</span></div>}

          <div className="trust-row">
            <span><ShieldCheck size={15} /> Processed on your device</span>
            <span><Focus size={15} /> No account needed</span>
            <span><Highlighter size={15} /> Gentle sentence focus</span>
          </div>
        </section>

        <section className="feature-strip" aria-label="Bookflow features">
          <article><span>01</span><h2>Sentence flow</h2><p>A soft highlight travels naturally with your reading position.</p></article>
          <article><span>02</span><h2>Your rhythm</h2><p>Shape the type, spacing, width, and atmosphere around you.</p></article>
          <article><span>03</span><h2>Ideas that stay</h2><p>Pin a sentence, leave a note, and return to what mattered.</p></article>
        </section>

        {loading && <LoadingOverlay loading={loading} />}
      </main>
    )
  }

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
        <aside className={`contents-panel ${sidebarOpen ? 'is-open' : ''}`}>
          <div className="panel-heading"><span><Library size={16} /> Contents</span><button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Close contents"><X size={18} /></button></div>
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
              <div className="document-stats"><span>{totalWords.toLocaleString()} words</span><i /><span>{minutes} min read</span><i /><span>Saved locally</span></div>
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

        {focusedSentence && (
          <div className="focus-card" aria-live="polite">
            <div className="focus-card-label"><Focus size={14} /> {pinnedId ? 'Focus held' : 'In focus'}</div>
            <p>{focusedSentence.text}</p>
            <div>
              <button onClick={toggleBookmark}>{isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}{isBookmarked ? 'Saved' : 'Save'}</button>
              <button onClick={copyFocusedSentence}><Copy size={16} /> Copy</button>
              {pinnedId && <button onClick={() => setPinnedId('')}><Check size={16} /> Resume flow</button>}
            </div>
          </div>
        )}

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

function Brand({ compact = false }) {
  return <div className={`brand ${compact ? 'compact' : ''}`}><span><BookOpen size={compact ? 17 : 20} /></span><strong>bookflow</strong></div>
}

function LoadingOverlay({ loading }) {
  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-card">
        <div className="page-loader"><span /><span /><span /></div>
        <div><small>Preparing your book</small><h2>{loading.label}</h2><p>{loading.name}</p></div>
        <div className="loading-progress"><i style={{ width: `${Math.max(8, loading.percent)}%` }} /></div>
        <span className="loading-percent">{loading.percent}%</span>
      </div>
    </div>
  )
}

function SettingsPanel({ settings, setSettings, open, close }) {
  const update = (key, value) => setSettings((current) => ({ ...current, [key]: value }))
  return (
    <aside className={`settings-popover ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="panel-heading"><span><Settings2 size={16} /> Reading space</span><button className="icon-button" onClick={close} aria-label="Close settings"><X size={18} /></button></div>
      <div className="setting-group">
        <label>Atmosphere</label>
        <div className="segmented">
          <button className={settings.theme === 'paper' ? 'active' : ''} onClick={() => update('theme', 'paper')}><Sun size={15} /> Paper</button>
          <button className={settings.theme === 'dusk' ? 'active' : ''} onClick={() => update('theme', 'dusk')}><Moon size={15} /> Dusk</button>
        </div>
      </div>
      <div className="setting-group">
        <label htmlFor="font-size">Text size <b>{settings.fontSize}px</b></label>
        <input id="font-size" type="range" min="17" max="25" value={settings.fontSize} onChange={(event) => update('fontSize', Number(event.target.value))} />
      </div>
      <div className="setting-group">
        <label htmlFor="line-height">Line space <b>{settings.lineHeight.toFixed(1)}</b></label>
        <input id="line-height" type="range" min="1.5" max="2.2" step="0.1" value={settings.lineHeight} onChange={(event) => update('lineHeight', Number(event.target.value))} />
      </div>
      <div className="setting-group">
        <label htmlFor="column-width">Page width <b>{settings.columnWidth}px</b></label>
        <input id="column-width" type="range" min="580" max="820" step="20" value={settings.columnWidth} onChange={(event) => update('columnWidth', Number(event.target.value))} />
      </div>
      <div className="setting-group">
        <label>Sentence focus</label>
        <div className="focus-options">
          {['off', 'soft', 'deep'].map((option) => <button key={option} className={settings.focus === option ? 'active' : ''} onClick={() => update('focus', option)}>{option}</button>)}
        </div>
        <p>Soft keeps nearby text present. Deep creates a quieter reading tunnel.</p>
      </div>
    </aside>
  )
}

function NotesPanel({ open, close, notes, setNotes, draft, setDraft, addNote, focusedSentence }) {
  return (
    <aside className={`notes-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="panel-heading"><span><MessageSquareText size={16} /> Margin notes</span><button className="icon-button" onClick={close} aria-label="Close notes"><X size={18} /></button></div>
      <div className="note-composer">
        {focusedSentence && <blockquote>{focusedSentence.text}</blockquote>}
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="What do you want to remember?" />
        <button onClick={addNote} disabled={!draft.trim()}><Plus size={16} /> Add note</button>
      </div>
      <div className="notes-list">
        {!notes.length && <div className="empty-notes"><MessageSquareText size={24} /><strong>Your margins are quiet</strong><span>Focus a sentence, then capture the thought it sparked.</span></div>}
        {notes.map((note) => (
          <article key={note.id}>
            {note.quote && <blockquote>{note.quote}</blockquote>}
            <p>{note.text}</p>
            <button onClick={() => setNotes((current) => current.filter((item) => item.id !== note.id))} aria-label="Delete note"><X size={14} /></button>
          </article>
        ))}
      </div>
    </aside>
  )
}

export default App
