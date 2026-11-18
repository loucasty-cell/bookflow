import { lazy, Suspense, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  BookOpen,
  ChevronRight,
  Moon,
  ShieldCheck,
  Sun,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import { ACCEPTED_FILES } from "../../document-import/index.js";
import { RecentShelf } from "../../library/index.js";
import { Brand, LoadingOverlay } from "../../../shared/components/index.js";
import { splitSentences } from "../../../shared/lib/index.js";
import bookflowArtwork from "../../../assets/bookflow-quill.png";
import { SAMPLE_BOOK } from "../sampleBook.js";
import { LivingShelf } from "./LivingShelf.jsx";

// Imported from the module rather than the barrel on purpose: the barrel is a
// static dependency of this file, so routing through it would put Three back in
// the entry graph and preload it on every page view.
const AmbientDustCanvas = lazy(() =>
  import("../../../shared/components/AmbientDustCanvas.jsx").then((module) => ({
    default: module.AmbientDustCanvas,
  }))
);

const previewChapter = SAMPLE_BOOK.chapters[1];
const previewSentences = splitSentences(previewChapter.paragraphs[0]);

export function LandingPage({
  dragging,
  setDragging,
  fileInputRef,
  handleFile,
  openBook,
  onOpenRecent,
  onOpenOcr,
  error,
  loading,
  theme,
  toggleTheme,
  onLocateFile,
}) {
  const reduceMotion = useReducedMotion();
  const [previewIndex, setPreviewIndex] = useState(0);

  const handleDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setDragging(false);
    }
  };

  const handleOpenRecent = (entry) => {
    if (onOpenRecent) {
      onOpenRecent(entry);
      return;
    }
    if (entry?.kind === "SAMPLE" || entry?.documentId === "bookflow-sample") {
      openBook(SAMPLE_BOOK, "bookflow-sample");
      return;
    }
    onLocateFile?.(entry);
  };

  return (
    <main
      id="main-content"
      data-modal-fallback-focus
      className="landing-shell relative overflow-hidden"
      data-theme={theme}
      tabIndex={-1}
    >
      <nav className="landing-nav relative z-10" aria-label="Primary navigation">
        <Brand />
        <div className="landing-nav-actions">
          <div className="nav-trust">
            <ShieldCheck size={15} /> Local by design
          </div>
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dusk" ? "Use light appearance" : "Use dark appearance"}
          >
            {theme === "dusk" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </nav>

      <section className="hero relative z-10">
        {!reduceMotion && (
          <Suspense fallback={null}>
            <AmbientDustCanvas theme={theme} />
          </Suspense>
        )}
        <div className="hero-copy-column">
          <h1>
            Read with
            <br />
            <span>room to think.</span>
          </h1>
          <p className="hero-copy">
            Turn a dense PDF into a page you can read at your own pace. Follow one sentence at a time and pick up where you left off.
          </p>

          <div
            className={`drop-card${dragging ? " is-dragging" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={handleDragLeave}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const dropped = event.dataTransfer.files?.[0];
              if (dropped) handleFile(dropped);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILES}
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) handleFile(selected);
              }}
              aria-label="Choose a book or document"
              aria-describedby="book-import-formats"
            />
            <div className="upload-icon" aria-hidden="true">
              <UploadCloud size={24} strokeWidth={1.8} />
            </div>
            <div className="drop-card-copy">
              <strong>
                {dragging ? "Release to begin" : "Open a book"}
              </strong>
              <span>Drop it here or choose a file</span>
              <small id="book-import-formats">PDF, EPUB, TXT, or Markdown up to 50 MB</small>
            </div>
          </div>

          <p className="import-guidance">
            Standard imports stay on your device, including OCR for scanned English PDFs.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="sample-button"
              onClick={() => openBook(SAMPLE_BOOK, "bookflow-sample")}
            >
              <BookOpen size={16} aria-hidden="true" />
              Read the sample
            </button>

            {onOpenOcr && (
              <button
                type="button"
                className="sample-button ocr-entry-button"
                onClick={onOpenOcr}
              >
                <Zap size={16} aria-hidden="true" />
                Optional accelerated OCR
              </button>
            )}
          </div>

          {error && (
            <div className="error-card" role="alert">
              <X size={17} /> <span>{error}</span>
            </div>
          )}
        </div>

        <figure className="hero-visual" aria-label="Bookflow reading preview">
          <div className="hero-artwork">
            <img
              src={bookflowArtwork}
              alt="A sculpted quill rising from an open book beside blue and red ink"
            />
          </div>
          <figcaption className="hero-reading-preview">
            <div className="hero-preview-header">
              <span>{previewChapter.title}</span>
              <button type="button" aria-label="Next preview sentence" onClick={() => setPreviewIndex((index) => (index + 1) % previewSentences.length)}>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
            <p>{previewSentences.map((sentence, index) => (
              <span key={sentence} aria-current={index === previewIndex ? "true" : undefined}>{sentence} </span>
            ))}</p>
            <span className="visually-hidden" role="status">Sentence {previewIndex + 1} of {previewSentences.length}</span>
          </figcaption>
        </figure>
      </section>

      {/* Interactive 3D Living Shelf Section */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <RecentShelf onSelect={handleOpenRecent} onLocateFile={onLocateFile} />
        <LivingShelf
          onOpenBook={(book, id) => openBook(book, id ?? (book.kind === "SAMPLE" ? "bookflow-sample" : `curated:${book.title}`))}
          onUploadClick={() => fileInputRef.current?.click()}
        />
      </div>

      {loading && <LoadingOverlay loading={loading} />}
    </main>
  );
}
