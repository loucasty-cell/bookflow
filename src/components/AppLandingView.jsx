import { lazy, Suspense } from "react";
import { X } from "lucide-react";
import { BookOpeningIntro, LandingPage } from "../features/landing/index.js";
import { SAMPLE_BOOK } from "../features/landing/sampleBook.js";
import {
  BadgeGallery,
  ResumeCard,
  SessionRecap,
  getResumeEntry,
} from "../features/library/index.js";

const OcrUploader = lazy(() =>
  import("./OcrUploader.jsx").then((module) => ({
    default: module.OcrUploader,
  }))
);

const WidgetGrid = lazy(() =>
  import("../features/widgets/index.js").then((module) => ({
    default: module.WidgetGrid,
  }))
);

const WidgetGridSkeleton = lazy(() =>
  import("../features/widgets/index.js").then((module) => ({
    default: module.WidgetGridSkeleton,
  }))
);

export function AppLandingView({
  showEntryIntro,
  completeEntryIntro,
  settings,
  setSettings,
  sessionRecap,
  setSessionRecap,
  awardedBadges,
  awardBadges,
  fileInputRef,
  dragging,
  setDragging,
  handleFile,
  openBook,
  setOcrOpen,
  error,
  loading,
  ocrOpen,
  ocrDialogRef,
  ocrCloseButtonRef,
  handleOcrDocumentLoaded,
}) {
  const resumeEntry = settings.showResumeCard ? getResumeEntry() : null;

  const handleResume = (entry) => {
    if (entry?.documentId === "bookflow-sample" || entry?.kind === "SAMPLE") {
      openBook(SAMPLE_BOOK, "bookflow-sample");
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      {showEntryIntro && <BookOpeningIntro onComplete={completeEntryIntro} />}

      <div className="landing-library-layer" data-theme={settings.theme}>
        {resumeEntry && (
          <div className="landing-resume-wrap">
            <ResumeCard
              entry={resumeEntry}
              onResume={handleResume}
              onReopen={() => fileInputRef.current?.click()}
            />
          </div>
        )}
        {settings.showAchievements && (
          <BadgeGallery enabled awarded={awardedBadges} onAward={awardBadges} />
        )}
        {settings.showAchievements && (
          <div className="landing-widgets-wrap">
            <Suspense fallback={<WidgetGridSkeleton />}>
              <WidgetGrid onResume={handleResume} />
            </Suspense>
          </div>
        )}
        <SessionRecap session={sessionRecap} onClose={() => setSessionRecap(null)} />
      </div>

      <LandingPage
        dragging={dragging}
        setDragging={setDragging}
        fileInputRef={fileInputRef}
        handleFile={handleFile}
        openBook={openBook}
        onOpenOcr={() => setOcrOpen(true)}
        error={error}
        loading={loading}
        theme={settings.theme}
        toggleTheme={() =>
          setSettings((current) => ({
            ...current,
            theme: current.theme === "dusk" ? "paper" : "dusk",
          }))
        }
      />
      {ocrOpen && (
        <div
          className="ocr-modal-overlay"
          data-theme={settings.theme}
          onClick={() => setOcrOpen(false)}
          role="presentation"
        >
          <div
            ref={ocrDialogRef}
            className="ocr-modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="OCR document scanner"
            aria-labelledby="ocr-modal-title"
            tabIndex={-1}
          >
            <div className="ocr-modal-header">
              <button
                ref={ocrCloseButtonRef}
                className="ocr-modal-close"
                type="button"
                onClick={() => setOcrOpen(false)}
                aria-label="Close OCR scanner"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <Suspense fallback={null}>
              <OcrUploader
                onDocumentLoaded={handleOcrDocumentLoaded}
                onUseLocalOcr={(file) => {
                  setOcrOpen(false);
                  handleFile(file);
                }}
              />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
}
