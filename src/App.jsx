import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseDocument } from './features/document-import/index.js'
import { LandingPage } from './features/landing/index.js'
import { DEFAULT_SETTINGS, ReaderPage } from './features/reader/index.js'
import { documentId, documentStorageKey, safeParse, splitSentences, wordCount } from './shared/lib/index.js'

const FRONT_MATTER_PATTERN = /cover|title page|contents|table of contents|copyright|dedication|acknowledg|preface|foreword|prologue|introduction|epigraph|author(?:'s)? note|opening note/i
const BACK_MATTER_PATTERN = /appendix|bibliograph|references|glossary|index|credits|afterword|epilogue|about the author/i

function isFocusEligibleChapter(chapter, index, total) {
  if (total <= 2) return true

  const title = String(chapter.title ?? '')
  const words = wordCount(chapter.paragraphs.join(' '))
  const chapterLikeTitle = /chapter|part|section|lesson|unit|act|volume/i.test(title)
  if (FRONT_MATTER_PATTERN.test(title)) return false
  if (index >= total - 2 && BACK_MATTER_PATTERN.test(title)) return false
  if (index < 2 && /^(page\s*)?[12]$/i.test(title.trim())) return false
  if (index < 2 && words < 90 && !chapterLikeTitle) return false
  if (index >= total - 2 && words < 80 && !chapterLikeTitle) return false
  return true
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

    const chaptersWithEligibility = book.chapters.map((chapter, chapterIndex) => ({
      ...chapter,
      focusEligible: isFocusEligibleChapter(chapter, chapterIndex, book.chapters.length),
      paragraphs: chapter.paragraphs.map((paragraph, paragraphIndex) => ({
        text: paragraph,
        sentences: splitSentences(paragraph).map((text, sentenceIndex) => ({
          id: `${chapterIndex}-${paragraphIndex}-${sentenceIndex}`,
          text,
          chapterIndex,
        })),
      })),
    }))

    if (chaptersWithEligibility.some((chapter) => chapter.focusEligible)) return chaptersWithEligibility
    return chaptersWithEligibility.map((chapter) => ({ ...chapter, focusEligible: true }))
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
  const focusId = pinnedId || activeId
  const focusedSentence = sentenceMap.get(focusId)
  const isBookmarked = focusId ? bookmarks.includes(focusId) : false

  useEffect(() => {
    localStorage.setItem('bookflow:settings', JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    if (!bookId) return

    localStorage.setItem(
      documentStorageKey(bookId),
      JSON.stringify({ notes, bookmarks, progress, scrollTop: readerRef.current?.scrollTop ?? 0 }),
    )
  }, [bookId, bookmarks, notes, progress])

  useEffect(() => {
    if (!book || !readerRef.current) return undefined
    const reader = readerRef.current

    const updateReadingPosition = () => {
      if (frameRef.current) return

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null
        const maxScroll = reader.scrollHeight - reader.clientHeight
        const nextProgress = maxScroll > 0
          ? Math.min(100, Math.max(0, Math.round((reader.scrollTop / maxScroll) * 100)))
          : 100
        setProgress(nextProgress)

        if (!pinnedId) {
          const readerBounds = reader.getBoundingClientRect()
          const targetY = readerBounds.top + reader.clientHeight * 0.32
          let nearest = null
          let nearestDistance = Number.POSITIVE_INFINITY

          reader.querySelectorAll('[data-sentence-id]').forEach((element) => {
            const bounds = element.getBoundingClientRect()
            if (bounds.bottom < readerBounds.top || bounds.top > readerBounds.bottom) return

            const distance = Math.abs(bounds.top + bounds.height / 2 - targetY)
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

  useEffect(() => {
    if (!book || !chapters.length) return
    const firstFocusableSentence = chapters
      .filter((chapter) => chapter.focusEligible)
      .flatMap((chapter) => chapter.paragraphs.flatMap((paragraph) => paragraph.sentences))[0]
    if (firstFocusableSentence) setActiveId(firstFocusableSentence.id)
  }, [book, bookId, chapters])

  const openBook = useCallback((nextBook, id) => {
    const saved = safeParse(localStorage.getItem(documentStorageKey(id)), {})
    restoreScrollRef.current = saved.scrollTop ?? 0
    setBook(nextBook)
    setBookId(id)
    setNotes(saved.notes ?? [])
    setBookmarks(saved.bookmarks ?? [])
    setProgress(saved.progress ?? 0)
    setActiveId('')
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

    setNotes((current) => [
      { id: crypto.randomUUID(), sentenceId: focusId, quote: focusedSentence?.text ?? '', text },
      ...current,
    ])
    setNoteDraft('')
  }

  if (!book) {
    return (
      <LandingPage
        dragging={dragging}
        setDragging={setDragging}
        fileInputRef={fileInputRef}
        handleFile={handleFile}
        openBook={openBook}
        error={error}
        loading={loading}
      />
    )
  }

  return (
    <ReaderPage
      book={book}
      settings={settings}
      setSettings={setSettings}
      chapters={chapters}
      activeChapter={activeChapter}
      progress={progress}
      notes={notes}
      setNotes={setNotes}
      bookmarks={bookmarks}
      noteDraft={noteDraft}
      setNoteDraft={setNoteDraft}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      notesOpen={notesOpen}
      setNotesOpen={setNotesOpen}
      settingsOpen={settingsOpen}
      setSettingsOpen={setSettingsOpen}
      focusId={focusId}
      focusedSentence={focusedSentence}
      pinnedId={pinnedId}
      setPinnedId={setPinnedId}
      isBookmarked={isBookmarked}
      minutes={minutes}
      totalWords={totalWords}
      readerRef={readerRef}
      closeBook={closeBook}
      jumpToChapter={jumpToChapter}
      focusSentence={focusSentence}
      toggleBookmark={toggleBookmark}
      copyFocusedSentence={copyFocusedSentence}
      addNote={addNote}
    />
  )
}

export default App
