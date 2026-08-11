import { BookOpen, ChevronRight, Focus, Highlighter, ShieldCheck, Sparkles, UploadCloud, X } from 'lucide-react'
import { ACCEPTED_FILES } from '../../document-import/index.js'
import { Brand, LoadingOverlay } from '../../../shared/components/index.js'
import { SAMPLE_BOOK } from '../sampleBook.js'

export function LandingPage({ dragging, setDragging, fileInputRef, handleFile, openBook, error, loading }) {
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
