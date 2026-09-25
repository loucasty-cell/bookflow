import { useEffect } from "react";
import { ensureSelectedSegmentVisible } from "../lib/readerViewport.js";
import { useReaderStore } from "../../../store/readerStore.js";

function readNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function readParagraphNumber(element, key, fallback = 0) {
  return readNumber(element.dataset?.[key], fallback);
}

export function getSafeRestoreScrollTop(value, scrollHeight, clientHeight) {
  const requested = Number(value);
  if (!Number.isFinite(requested) || requested <= 0) return 0;
  const maximum = Math.max(
    0,
    readNumber(scrollHeight) - readNumber(clientHeight),
  );
  return Math.min(requested, maximum);
}

export function useReaderMeasurement({
  book,
  readerRef,
  activeParagraphIdRef,
  hasMeasuredBookRef,
  pendingRestoreParagraphRef,
  pendingRestoreScrollTopRef,
  hasRestorePositionRef,
  paragraphsRef,
  activeParagraphIsLargeRef,
  setReaderState,
  setActiveParagraphIsLarge,
  updateStaticRegion,
  updateStaticScrollState,
  commitFocus,
  queueParagraphAlignment,
  frameRef,
  readerSizeRef,
  programmaticScrollRef,
  lastProgrammaticScrollTimeRef,
  measureKey = "",
}) {
  useEffect(() => {
    if (!book || !readerRef.current) return undefined;

    const reader = readerRef.current;
    let disposed = false;
    let restoreScrollTimer = null;

    const measureParagraphs = () => {
      if (disposed) return;

      const isInitialMeasurement = !hasMeasuredBookRef.current;
      const shouldStartAtDocumentTop =
        isInitialMeasurement &&
        useReaderStore.getState().settings.mode === "focus" &&
        !hasRestorePositionRef.current &&
        reader?.querySelector(".reading-section")?.dataset.focusEligible === "false";
      if (shouldStartAtDocumentTop) reader.scrollTo({ top: 0, behavior: "auto" });

      const readerBounds = reader.getBoundingClientRect();
      const previousReaderSize = readerSizeRef.current;
      const readerSizeChanged =
        previousReaderSize.width > 0 &&
        (previousReaderSize.width !== reader.clientWidth ||
          previousReaderSize.height !== reader.clientHeight);
      readerSizeRef.current = {
        width: reader.clientWidth,
        height: reader.clientHeight,
      };
      const readerTotalParagraphs = readParagraphNumber(
        reader,
        "totalParagraphs",
        0,
      );
      const nextParagraphs = [...reader.querySelectorAll("[data-paragraph-id]")].map(
        (element, index) => {
          const bounds = element.getBoundingClientRect();
          const globalIndex = readParagraphNumber(
            element,
            "paragraphIndex",
            readParagraphNumber(element, "globalIndex", index),
          );
          const totalParagraphs = readParagraphNumber(
            element,
            "totalParagraphs",
            readParagraphNumber(element, "paragraphCount", readerTotalParagraphs),
          );
          return {
            id: element.dataset.paragraphId,
            chapter: Number(element.dataset.chapter),
            index: globalIndex,
            localIndex: index,
            globalIndex,
            totalParagraphs,
            top: bounds.top - readerBounds.top + reader.scrollTop,
            bottom: bounds.bottom - readerBounds.top + reader.scrollTop,
            left: bounds.left,
          };
        }
      );

      paragraphsRef.current = nextParagraphs;
      hasMeasuredBookRef.current = true;

      const staticRegion = updateStaticRegion();
      const restoreId = pendingRestoreParagraphRef.current;
      const canRestoreScrollOnly =
        !restoreId &&
        hasRestorePositionRef.current &&
        readNumber(pendingRestoreScrollTopRef?.current, 0) > 0;
      const restoreScrollOnly = () => {
        if (!canRestoreScrollOnly || typeof reader.scrollTo !== "function") return false;
        const restoreTop = getSafeRestoreScrollTop(
          pendingRestoreScrollTopRef?.current,
          reader.scrollHeight,
          reader.clientHeight,
        );
        if (restoreTop <= 0) return false;
        if (programmaticScrollRef) programmaticScrollRef.current = true;
        if (lastProgrammaticScrollTimeRef) {
          lastProgrammaticScrollTimeRef.current = performance.now();
        }
        reader.scrollTo({ top: restoreTop, behavior: "auto" });
        if (restoreScrollTimer) window.clearTimeout(restoreScrollTimer);
        restoreScrollTimer = window.setTimeout(() => {
          restoreScrollTimer = null;
          if (programmaticScrollRef) programmaticScrollRef.current = false;
          if (lastProgrammaticScrollTimeRef) {
            lastProgrammaticScrollTimeRef.current = performance.now();
          }
        }, 120);
        pendingRestoreParagraphRef.current = "";
        if (pendingRestoreScrollTopRef) pendingRestoreScrollTopRef.current = 0;
        if (staticRegion.isStatic) setReaderState("reading");
        return true;
      };

      if (!nextParagraphs.length) {
        if (restoreScrollOnly()) return;
        if (staticRegion.isStatic) {
          reader.scrollTo({ top: 0, behavior: "auto" });
          updateStaticScrollState(reader, staticRegion.section);
          setReaderState("reading");
        }
        return;
      }

      if (!isInitialMeasurement) {
        if (readerSizeChanged && useReaderStore.getState().settings.mode === "focus") {
          const existing = nextParagraphs.find(
            (paragraph) => paragraph.id === activeParagraphIdRef.current
          );
          if (existing) {
            queueParagraphAlignment(
              existing,
              "auto",
              existing.id === activeParagraphIdRef.current &&
                activeParagraphIsLargeRef.current,
            );
          }
        }
        return;
      }

      const restored = nextParagraphs.find(
        (paragraph) => paragraph.id === restoreId,
      );
      const existing = nextParagraphs.find(
        (paragraph) => paragraph.id === activeParagraphIdRef.current,
      );
      const target = restored ?? existing;
      if (!target && restoreScrollOnly()) return;

      const targetToCommit = target ?? nextParagraphs[0];
      const targetElement = reader.querySelector(
        `[data-paragraph-id="${targetToCommit.id}"]`,
      );
      let alignment = null;

      if (targetElement) {
        const bottomOverlay = reader.parentElement?.querySelector("[data-reader-bottom-overlay]");
        alignment = ensureSelectedSegmentVisible(
          targetElement,
          reader,
          bottomOverlay,
          { preserveLargePosition: true },
        );
        activeParagraphIsLargeRef.current = alignment.isLarge;
        setActiveParagraphIsLarge(alignment.isLarge);
        reader.style.setProperty("--reader-safe-top", `${alignment.safeTop}px`);
        reader.style.setProperty("--reader-safe-bottom", `${alignment.safeBottom}px`);
      }

      pendingRestoreParagraphRef.current = "";
      if (pendingRestoreScrollTopRef) pendingRestoreScrollTopRef.current = 0;
      commitFocus(targetToCommit);
      if (
        useReaderStore.getState().settings.mode === "focus" &&
        !hasRestorePositionRef.current &&
        (staticRegion.isStatic || shouldStartAtDocumentTop)
      ) {
        if (staticRegion.isStatic) {
          updateStaticScrollState(reader, staticRegion.section);
          setReaderState("reading");
        }
      } else if (useReaderStore.getState().settings.mode === "focus")
        queueParagraphAlignment(
          targetToCommit,
          "auto",
          alignment?.isLarge === true,
          true,
        );
    };

    const scheduleMeasurement = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        measureParagraphs();
      });
    };

    const resizeObserver = new ResizeObserver(scheduleMeasurement);
    resizeObserver.observe(reader);
    const readingColumn = reader.querySelector(".reading-column");
    if (readingColumn) resizeObserver.observe(readingColumn);
    scheduleMeasurement();

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (restoreScrollTimer) {
        window.clearTimeout(restoreScrollTimer);
        if (programmaticScrollRef) programmaticScrollRef.current = false;
      }
      restoreScrollTimer = null;
      frameRef.current = null;
      paragraphsRef.current = [];
      readerSizeRef.current = { width: 0, height: 0 };
    };
  }, [
    book,
    measureKey,
    commitFocus,
    queueParagraphAlignment,
    updateStaticRegion,
    updateStaticScrollState,
    setReaderState,
    setActiveParagraphIsLarge,
    activeParagraphIdRef,
    activeParagraphIsLargeRef,
    hasMeasuredBookRef,
    hasRestorePositionRef,
    paragraphsRef,
    pendingRestoreParagraphRef,
    pendingRestoreScrollTopRef,
    readerRef,
    frameRef,
    readerSizeRef,
    programmaticScrollRef,
    lastProgrammaticScrollTimeRef,
  ]);
}
