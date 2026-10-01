import { lazy, Suspense, useState } from "react";
import {
  BookOpen,
  Focus,
  Highlighter,
  Moon,
  ShieldCheck,
  Sun,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import { ACCEPTED_FILES } from "../../document-import/index.js";
import { RecentShelf } from "../../library/index.js";
import { Brand, LoadingOverlay, ThreeDButton } from "../../../shared/components/index.js";
import { usePointerCssVars } from "../../../shared/lib/usePointerCssVars.js";
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

export function LandingPage({
  dragging,
  setDragging,
  fileInputRef,
  handleFile,
  openBook,
  onOpenOcr,
  error,
  loading,
  theme,
  toggleTheme,
  onLocateFile,
}) {
  const [isPopped, setIsPopped] = useState(false);
  const cardRef = usePointerCssVars();

  const handleDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setDragging(false);
    }
  };

  const handleCardClick = () => {
    setIsPopped(true);
    setTimeout(() => setIsPopped(false), 500);
  };

  const handleOpenRecent = (entry) => {
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
      <Suspense fallback={null}>
        <AmbientDustCanvas active={true} theme={theme} />
      </Suspense>

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
        <div className="hero-copy-column">
          <div className="eyebrow">
            Focused Reading Environment
          </div>
          <h1>
            Read deeper.
            <br />
            <span>Keep going.</span>
          </h1>
          <p className="hero-copy">
            Bookflow keeps your place and brings one paragraph forward at a time. Read privately, return exactly where you left off.
          </p>

          <div
            ref={cardRef}
            className={`drop-card ${dragging ? "is-dragging" : ""} ${isPopped ? "is-popped" : ""}`}
            onMouseDown={handleCardClick}
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
            />
            <div className="upload-icon">
              <UploadCloud size={24} strokeWidth={1.8} />
            </div>
            <div className="drop-card-copy">
              <strong>
                {dragging ? "Release to begin" : "Open a book"}
              </strong>
              <span>Drop it here or choose a file</span>
              <small>Private check. No upload.</small>
            </div>
            <div className="format-row" aria-label="Supported formats">
              <span>PDF</span>
              <span>EPUB</span>
              <span>TXT</span>
              <span>MD</span>
            </div>
          </div>

          <p className="import-guidance">
            PDF, EPUB, plain text, or Markdown up to 50 MB. Scanned English PDFs use private on-device OCR, with optional PaddleOCR and Hugging Face backend acceleration.
          </p>

          <div className="hero-actions">
            <ThreeDButton
              variant="primary"
              size="lg"
              onClick={() => openBook(SAMPLE_BOOK, "bookflow-sample")}
              icon={BookOpen}
            >
              Read the sample
            </ThreeDButton>

            {onOpenOcr && (
              <ThreeDButton
                variant="secondary"
                size="lg"
                onClick={onOpenOcr}
                icon={Zap}
              >
                Optional accelerated OCR
              </ThreeDButton>
            )}
            <span><ShieldCheck size={15} /> Standard imports stay on your device</span>
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
              <strong>One paragraph. Keep the thread.</strong>
            </figcaption>
          </figure>
          <div className="visual-card visual-card-focus">
            <Highlighter size={17} />
            <span><strong>Keep your place</strong>Scroll sets the rhythm</span>
          </div>
          <div className="visual-card visual-card-private">
            <ShieldCheck size={17} />
            <span><strong>Local by default</strong>Your book stays yours</span>
          </div>
        </div>
      </section>

      {/* Interactive 3D Living Shelf Section */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <RecentShelf onSelect={handleOpenRecent} onLocateFile={onLocateFile} />
        <LivingShelf
          onOpenBook={(book, id) => openBook(book, id ?? (book.kind === "SAMPLE" ? "bookflow-sample" : `curated:${book.title}`))}
          onUploadClick={() => fileInputRef.current?.click()}
        />
      </div>

      <section className="feature-strip relative z-10" aria-label="Bookflow features">
        <article>
          <h2>Calm by default</h2>
          <p>Content leads. Controls stay quiet until you need them.</p>
        </article>
        <article>
          <h2>Find your pace</h2>
          <p>Adjust type, spacing, width, focus depth, and atmosphere.</p>
        </article>
        <article>
          <h2>Private by default</h2>
          <p>Keep bookmarks, notes, and progress on this device.</p>
        </article>
      </section>

      {loading && <LoadingOverlay loading={loading} />}
    </main>
  );
}
