import {
  BookOpen,
  ChevronRight,
  Focus,
  Highlighter,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  UploadCloud,
  X,
} from "lucide-react";
import { ACCEPTED_FILES } from "../../document-import/index.js";
import { Brand, LoadingOverlay } from "../../../shared/components/index.js";
import bookflowArtwork from "../../../assets/bookflow-quill.png";
import { SAMPLE_BOOK } from "../sampleBook.js";

export function LandingPage({
  dragging,
  setDragging,
  fileInputRef,
  handleFile,
  openBook,
  error,
  loading,
  theme,
  toggleTheme,
}) {
  return (
    <main className="landing-shell" data-theme={theme}>
      <nav className="landing-nav" aria-label="Primary navigation">
        <Brand />
        <div className="landing-nav-actions">
          <div className="nav-trust">
            <ShieldCheck size={15} /> Private by design
          </div>
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dusk" ? "Use light appearance" : "Use black appearance"}
          >
            {theme === "dusk" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy-column">
          <div className="eyebrow">
            <Sparkles size={14} /> A private reading studio
          </div>
          <h1>
            Read deeper.
            <br />
            <span>Stay longer.</span>
          </h1>
          <p className="hero-copy">
            Bookflow turns PDFs and ebooks into a calm, focused reading space.
            One complete paragraph stays gently present while the rest of the
            page gets out of your way.
          </p>

          <div
            className={`drop-card ${dragging ? "is-dragging" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              handleFile(event.dataTransfer.files[0]);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILES}
              onChange={(event) => handleFile(event.target.files[0])}
              aria-label="Choose a book or document"
            />
            <div className="upload-icon">
              <UploadCloud size={24} strokeWidth={1.8} />
            </div>
            <div className="drop-card-copy">
              <strong>
                {dragging ? "Release to begin" : "Open a book"}
              </strong>
              <span>Drop it here or choose a file</span>
              <small>Verified locally before opening</small>
            </div>
            <div className="format-row" aria-label="Supported formats">
              <span>PDF</span>
              <span>EPUB</span>
              <span>TXT</span>
              <span>MD</span>
            </div>
          </div>

          <p className="import-guidance">
            PDF, EPUB, plain text, or Markdown up to 50 MB. English scanned PDFs
            are read privately with on-device OCR.
          </p>

          <div className="hero-actions">
            <button
              className="sample-button"
              onClick={() => openBook(SAMPLE_BOOK, "bookflow-sample")}
            >
              <BookOpen size={17} /> Try the sample <ChevronRight size={16} />
            </button>
            <span><ShieldCheck size={15} /> Nothing leaves your device</span>
          </div>

          {error && (
            <div className="error-card" role="alert">
              <X size={17} /> <span>{error}</span>
            </div>
          )}

          <div className="trust-row">
            <span><Focus size={15} /> No account</span>
            <span><Highlighter size={15} /> Whole-paragraph focus</span>
            <span><ShieldCheck size={15} /> Local progress</span>
          </div>
        </div>

        <div className="hero-visual">
          <figure className="hero-artwork">
            <img
              src={bookflowArtwork}
              alt="A sculpted quill rising from an open book beside blue and red ink"
            />
            <figcaption>
              <span>Bookflow focus</span>
              <strong>One paragraph. Less noise.</strong>
            </figcaption>
          </figure>
          <div className="visual-card visual-card-focus">
            <Highlighter size={17} />
            <span><strong>Gentle focus</strong>Scroll sets the rhythm</span>
          </div>
          <div className="visual-card visual-card-private">
            <ShieldCheck size={17} />
            <span><strong>Local first</strong>Your book stays yours</span>
          </div>
        </div>
      </section>

      <section className="feature-strip" aria-label="Bookflow features">
        <article>
          <span>01</span>
          <h2>Calm by default</h2>
          <p>Content leads. Controls stay quiet until you need them.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Built around you</h2>
          <p>Adjust type, spacing, width, focus depth, and atmosphere.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Private memory</h2>
          <p>Keep bookmarks, notes, and progress on this device.</p>
        </article>
      </section>

      {loading && <LoadingOverlay loading={loading} />}
    </main>
  );
}
