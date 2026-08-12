import {
  BookOpen,
  ChevronRight,
  Focus,
  Highlighter,
  ShieldCheck,
  Sparkles,
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
}) {
  return (
    <main className="landing-shell">
      <nav className="landing-nav" aria-label="Primary navigation">
        <Brand />
        <div className="nav-trust">
          <ShieldCheck size={15} /> Private by design
        </div>
      </nav>

      <section className="hero">
        <figure className="hero-artwork">
          <img
            src={bookflowArtwork}
            alt="A sculpted quill rising from an open book beside blue and red ink"
          />
          <figcaption>
            <span>Private reading studio</span>
            <strong>Made for long-form focus</strong>
          </figcaption>
        </figure>
        <div className="eyebrow">
          <Sparkles size={14} /> A calmer way to read
        </div>
        <h1>
          Stay with the paragraph.
          <br />
          <span>Let the pages flow.</span>
        </h1>
        <p className="hero-copy">
          Turn PDFs and ebooks into a beautifully focused reading space.
          Bookflow gently follows each complete paragraph, so your attention has
          somewhere comfortable to land.
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
            <UploadCloud size={26} strokeWidth={1.8} />
          </div>
          <div className="drop-card-copy">
            <strong>
              {dragging ? "Release to begin" : "Drop a book here"}
            </strong>
            <span>or click to choose a file</span>
            <small>
              File type and readable content are checked before opening.
            </small>
          </div>
          <div className="format-row" aria-label="Supported formats">
            <span>PDF</span>
            <span>EPUB</span>
            <span>TXT</span>
            <span>MD</span>
          </div>
        </div>

        <p className="import-guidance">
          PDF, EPUB, plain text, or Markdown up to 50 MB. Scanned PDFs need OCR.
        </p>

        <button
          className="sample-button"
          onClick={() => openBook(SAMPLE_BOOK, "bookflow-sample")}
        >
          <BookOpen size={17} /> Try the reading experience{" "}
          <ChevronRight size={16} />
        </button>

        {error && (
          <div className="error-card" role="alert">
            <X size={17} /> <span>{error}</span>
          </div>
        )}

        <div className="trust-row">
          <span>
            <ShieldCheck size={15} /> Processed on your device
          </span>
          <span>
            <Focus size={15} /> No account needed
          </span>
          <span>
            <Highlighter size={15} /> Gentle paragraph focus
          </span>
        </div>
      </section>

      <section className="feature-strip" aria-label="Bookflow features">
        <article>
          <span>01</span>
          <h2>Paragraph flow</h2>
          <p>A soft highlight travels naturally with your reading position.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Your rhythm</h2>
          <p>Shape the type, spacing, width, and atmosphere around you.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Ideas that stay</h2>
          <p>Pin a paragraph, leave a note, and return to what mattered.</p>
        </article>
      </section>

      {loading && <LoadingOverlay loading={loading} />}
    </main>
  );
}
