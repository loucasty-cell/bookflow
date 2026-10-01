import React, { lazy, Suspense } from "react";
import { useUIStore } from "../../../store/uiStore.js";
import { useReadingLens } from "../hooks/useReadingLens.js";

const FocusCard = lazy(() =>
  import("./FocusCard.jsx").then((module) => ({
    default: module.FocusCard,
  }))
);

const noop = () => {};

export function FocusBarHost({ open = true }) {
  const focusBarOpen = useUIStore((state) => state.focusBarOpen);

  /**
   * The global ambient bar is a separate surface with no selection of its own,
   * so it owns its own instance. The selection-scoped card and the lens bar
   * share one instance between them, which is where the consent decision lives.
   */
  const lens = useReadingLens({ selectedText: "" });

  if (!open || !focusBarOpen) return null;

  return (
    <Suspense fallback={null}>
      <FocusCard
        surface="global"
        focusedParagraph={null}
        pinnedId=""
        isBookmarked={false}
        toggleBookmark={noop}
        copyFocusedParagraph={noop}
        moveFocus={noop}
        resumeFlow={noop}
        lens={lens}
      />
    </Suspense>
  );
}
