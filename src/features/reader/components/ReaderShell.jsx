/**
 * ReaderShell: top-level reader layout composition.
 *
 * Replaces the reader branch of App.jsx with a focused composition component.
 */
import { lazy, Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "../../../shared/components/index.js";
import { InterventionModal } from "../../../components/InterventionModal.jsx";

const VariableRewardCapsule = lazy(() =>
  import("../../../components/VariableRewardCapsule.jsx").then((m) => ({
    default: m.VariableRewardCapsule,
  }))
);

export function ReaderShell({
  book,
  closeBook,
  showIntervention,
  setShowIntervention,
  showRewardCapsules,
  rewardChapterTitle,
  children,
}) {
  return (
    <>
      <ErrorBoundary onReset={closeBook}>
        {children}
      </ErrorBoundary>
      {showRewardCapsules && (
        <Suspense fallback={null}>
          <VariableRewardCapsule chapterTitle={rewardChapterTitle ?? book?.title} />
        </Suspense>
      )}
      <AnimatePresence>
        {showIntervention && (
          <InterventionModal onDismiss={() => setShowIntervention(false)} bookTitle={book?.title} />
        )}
      </AnimatePresence>
    </>
  );
}
