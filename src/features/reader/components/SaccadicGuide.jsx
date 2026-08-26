import { useEffect, useState, useRef } from "react";
import { FOCUS_RAIL_RATIO } from "../index.js";

/**
 * Saccadic Return Pad & Margin Rhythm Guide.
 * Positions a calm, ambient vertical rhythm tick in the left reader gutter
 * exactly aligned with the 42% golden reading focus rail.
 * Grounded in research by Bottos & Balasingam (2019) to reduce line-skipping return sweep disorientation.
 */
export function SaccadicGuide({ readerRef, activeParagraphId, visible = true }) {
  const [guideTop, setGuideTop] = useState(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!visible || !readerRef?.current) return;

    const updatePosition = () => {
      const reader = readerRef.current;
      if (!reader) return;

      const readerRect = reader.getBoundingClientRect();
      const railY = readerRect.top + reader.clientHeight * FOCUS_RAIL_RATIO;

      if (activeParagraphId) {
        const activeElem = reader.querySelector(`[data-paragraph-id="${activeParagraphId}"]`);
        if (activeElem) {
          const elemRect = activeElem.getBoundingClientRect();
          // Anchor the guide to the active paragraph's relative vertical position
          const relativeY = Math.max(elemRect.top, Math.min(railY, elemRect.bottom - 20));
          setGuideTop(relativeY - readerRect.top);
          return;
        }
      }

      setGuideTop(reader.clientHeight * FOCUS_RAIL_RATIO);
    };

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePosition);
    };

    const reader = readerRef.current;
    reader.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    updatePosition();

    return () => {
      if (reader) reader.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [readerRef, activeParagraphId, visible]);

  if (!visible || guideTop === null) return null;

  return (
    <div
      className="saccadic-return-pad"
      style={{
        transform: `translate3d(0, ${guideTop}px, 0)`,
      }}
      aria-hidden="true"
    >
      <div className="saccadic-notch" />
      <div className="saccadic-glow" />
    </div>
  );
}
