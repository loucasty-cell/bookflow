import { useCallback } from "react";
import { sectionAtFocusRail, staticRegionName } from "../lib/staticRegion.js";

export function useReaderStaticRegion({
  readerRef,
  overStaticRegionRef,
  setOverStaticRegion,
  setStaticRegionLabel,
  setActiveChapter,
  setProgress,
}) {
  const updateStaticRegion = useCallback(() => {
    const reader = readerRef.current;
    const section = sectionAtFocusRail(reader);
    const isStatic = section?.dataset.focusEligible === "false";
    if (overStaticRegionRef.current !== isStatic) {
      overStaticRegionRef.current = isStatic;
      setOverStaticRegion(isStatic);
    }
    if (isStatic) setStaticRegionLabel(staticRegionName(section));
    return { isStatic, section };
  }, [
    readerRef,
    overStaticRegionRef,
    setOverStaticRegion,
    setStaticRegionLabel,
  ]);

  const updateStaticScrollState = useCallback(
    (reader, section) => {
      if (section?.dataset.chapterIndex) setActiveChapter(Number(section.dataset.chapterIndex));
      const maximum = Math.max(0, reader.scrollHeight - reader.clientHeight);
      setProgress(maximum ? Math.round((reader.scrollTop / maximum) * 100) : 0);
    },
    [setProgress, setActiveChapter]
  );

  return { updateStaticRegion, updateStaticScrollState };
}
