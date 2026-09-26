import React, { lazy, Suspense } from "react";
import { useUIStore } from "../../../store/uiStore.js";

const FocusCard = lazy(() =>
  import("./FocusCard.jsx").then((module) => ({
    default: module.FocusCard,
  }))
);

const noop = () => {};

export function FocusBarHost({ open = true }) {
  const focusBarOpen = useUIStore((state) => state.focusBarOpen);

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
      />
    </Suspense>
  );
}
