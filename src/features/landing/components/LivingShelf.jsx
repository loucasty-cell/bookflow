import { useState, useEffect, useRef } from "react";
import { BookOpen, Plus } from "lucide-react";
import { ThreeDBookCard } from "./ThreeDBookCard.jsx";
import { SAMPLE_BOOK } from "../sampleBook.js";
import { getSafeStorage } from "../../../shared/lib/storage.js";

function textOf(paragraph) {
  if (typeof paragraph === "string") return paragraph;
  if (typeof paragraph?.text === "string") return paragraph.text;
  return "";
}

function toNormalizedBook(bookItem) {
  const chapters = (bookItem.chapters ?? []).map((chapter) => {
    const topLevel = Array.isArray(chapter.paragraphs)
      ? chapter.paragraphs.map(textOf).filter((text) => text.trim().length > 0)
      : [];
    const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
    const paragraphs = [
      ...topLevel,
      ...sections.flatMap((section) =>
        (section.paragraphs ?? []).map(textOf),
      ),
    ].filter((text) => text.trim().length > 0);
    const subheadings = sections
      .map((section) => ({
        title: section.title ?? null,
        paragraphs: (section.paragraphs ?? [])
          .map(textOf)
          .filter((text) => text.trim().length > 0),
      }))
      .filter((section) => section.paragraphs.length);
    return {
      title: chapter.title,
      paragraphs: paragraphs.length ? paragraphs : ["This chapter has no readable text."],
      ...(subheadings.some((section) => section.title) ? { subheadings } : {}),
    };
  });
  return {
    title: bookItem.title,
    author: bookItem.author ?? "",
    kind: bookItem.kind ?? "SAMPLE",
    chapters,
  };
}

const CURATED_LIBRARY = [
  {
    ...SAMPLE_BOOK,
    badge: "Sample Book",
    coverColor: "amber",
  },
  {
    title: "Meditations on First Philosophy",
    author: "René Descartes",
    kind: "PHILOSOPHY",
    badge: "Classic",
    coverColor: "navy",
    chapters: [
      {
        title: "Of the things which may be brought within the sphere of the doubtful",
        focusEligible: true,
        sections: [
          {
            title: "Foundations of Thought",
            paragraphs: [
              {
                id: "med-1",
                text: "Several years have now elapsed since I first became aware that I had accepted, even from my youth, many false opinions for true, and that consequently what I afterward based on such principles was highly doubtful.",
              },
              {
                id: "med-2",
                text: "I wished to give myself entirely to the search after truth, and therefore thought it necessary to reject as absolutely false everything concerning which I could imagine the least ground to doubt.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "The Architecture of Deep Focus",
    author: "Bookflow Research Lab",
    kind: "ESSAY",
    badge: "New",
    coverColor: "emerald",
    chapters: [
      {
        title: "The Mechanics of Saccadic Calm",
        focusEligible: true,
        sections: [
          {
            title: "Attention Invariants",
            paragraphs: [
              {
                id: "focus-1",
                text: "Deep reading is an act of neurological quietude. When the visual field is uncluttered, working memory expands and the reader enters an effortless state of sustained comprehension.",
              },
              {
                id: "focus-2",
                text: "By anchoring fixation points on syntactic nodes, the brain reduces regressive eye movements by over thirty percent, preserving mental stamina for complex reasoning.",
              },
            ],
          },
        ],
      },
    ],
  },
];

export function LivingShelf({ onOpenBook, onUploadClick }) {
  const plankRef = useRef(null);
  const [shadowDepth, setShadowDepth] = useState(() => {
    try {
      return getSafeStorage().getItem("bookflow_shelf_shadow") || "medium";
    } catch {
      return "medium";
    }
  });

  const handleShadowChange = (mode) => {
    setShadowDepth(mode);
    try {
      getSafeStorage().setItem("bookflow_shelf_shadow", mode);
    } catch {
      // Ignore storage errors
    }
  };

  const handleOpenBook = (bookItem) => {
    onOpenBook?.(toNormalizedBook(bookItem), `curated:${bookItem.title}`);
  };

  useEffect(() => {
    const plank = plankRef.current;
    if (!plank || typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    let rafId = null;
    let targetProximity = 0;
    let currentProximity = 0;

    const updateProximityStyles = () => {
      // Fluid spring restitution towards pointer proximity
      currentProximity += (targetProximity - currentProximity) * 0.12;

      // Dynamically shifts shadow intensity by 5-10% (from 1.00 up to 1.08 max)
      const intensityShift = 1 + currentProximity * 0.08;
      const blurShift = (currentProximity * 1.8).toFixed(2);
      const spreadShift = (1 + currentProximity * 0.04).toFixed(3);
      const yShift = (currentProximity * 1.4).toFixed(2);
      const plankLift = (-currentProximity * 1.5).toFixed(2);

      plank.style.setProperty("--shelf-proximity-intensity", intensityShift.toFixed(3));
      plank.style.setProperty("--shelf-proximity-blur-shift", `${blurShift}px`);
      plank.style.setProperty("--shelf-proximity-spread", spreadShift);
      plank.style.setProperty("--shelf-proximity-y", `${yShift}px`);
      plank.style.setProperty("--shelf-plank-lift", `${plankLift}px`);

      if (Math.abs(targetProximity - currentProximity) > 0.002 || targetProximity > 0.005) {
        rafId = requestAnimationFrame(updateProximityStyles);
      } else {
        currentProximity = targetProximity;
        const finalIntensity = 1 + currentProximity * 0.08;
        plank.style.setProperty("--shelf-proximity-intensity", finalIntensity.toFixed(3));
        plank.style.setProperty("--shelf-proximity-blur-shift", `${(currentProximity * 1.8).toFixed(2)}px`);
        plank.style.setProperty("--shelf-proximity-spread", (1 + currentProximity * 0.04).toFixed(3));
        plank.style.setProperty("--shelf-proximity-y", `${(currentProximity * 1.4).toFixed(2)}px`);
        plank.style.setProperty("--shelf-plank-lift", `${(-currentProximity * 1.5).toFixed(2)}px`);
        rafId = null;
      }
    };

    const handlePointerMove = (e) => {
      const rect = plank.getBoundingClientRect();
      const plankCenterY = rect.top + rect.height / 2;
      const plankCenterX = rect.left + rect.width / 2;

      const distX = Math.abs(e.clientX - plankCenterX);
      const distY = Math.abs(e.clientY - plankCenterY);

      // Vertical proximity influence zone (covering book grid above and space below)
      const maxDistY = 320;
      const maxDistX = rect.width / 2 + 120;

      if (distY < maxDistY && distX < maxDistX) {
        const normY = 1 - distY / maxDistY;
        const normX = 1 - Math.min(1, distX / maxDistX);
        const rawProx = Math.max(0, Math.min(1, normY * normX));
        // Smoothstep curve for natural tactile tactile response
        targetProximity = rawProx * rawProx * (3 - 2 * rawProx);
      } else {
        targetProximity = 0;
      }

      if (!rafId) {
        rafId = requestAnimationFrame(updateProximityStyles);
      }
    };

    const handlePointerLeave = () => {
      targetProximity = 0;
      if (!rafId) {
        rafId = requestAnimationFrame(updateProximityStyles);
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section className="living-shelf-section" aria-label="Curated Library Shelf">
      <div className="living-shelf-header">
        <div className="shelf-eyebrow">
          <BookOpen size={14} />
          <span>Curated Editions</span>
        </div>
        <h2 className="shelf-title">Select a volume or import your own</h2>
        <p className="shelf-subtitle">
          Open a classic instantly, or bring your own manuscript. All documents stay safely on your device.
        </p>
        <div className="shelf-controls-bar">
          <div className="shelf-shadow-control" role="group" aria-label="Shelf plank shadow mode">
            <span className="shadow-control-label">Shelf Depth:</span>
            <div className="shadow-segmented-pill">
              {["soft", "medium", "deep"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`shadow-pill-opt ${shadowDepth === mode ? "is-active" : ""}`}
                  onClick={() => handleShadowChange(mode)}
                  aria-pressed={shadowDepth === mode}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="living-shelf-grid">
        {CURATED_LIBRARY.map((bookItem, idx) => (
          <ThreeDBookCard
            key={`${bookItem.title}-${idx}`}
            book={bookItem}
            badge={bookItem.badge}
            coverColor={bookItem.coverColor}
            onOpen={handleOpenBook}
          />
        ))}

        {/* 3D Add Custom Book Card */}
        <div
          className="book-3d-scene book-3d-add-scene"
          style={{ perspective: "1200px", margin: "0 auto" }}
        >
          <button
            type="button"
            className="book-3d-prism book-3d-add-card"
            style={{ margin: "0 auto" }}
            onClick={onUploadClick}
            aria-label="Upload custom book"
          >
            <div className="add-card-inner">
              <div className="add-icon-bubble">
                <Plus size={26} />
              </div>
              <h4>Import File</h4>
              <p>PDF, EPUB, TXT, MD</p>
              <span className="add-privacy-tag">Zero Cloud Transfer</span>
            </div>
          </button>
        </div>
      </div>

      {/* Physical 3D Wooden/Linen Shelf Plank */}
      <div
        ref={plankRef}
        className="living-shelf-plank"
        data-shadow={shadowDepth}
        data-depth={shadowDepth}
        aria-hidden="true"
      >
        <div className="shelf-plank-top" />
        <div className="shelf-plank-edge" />
        <div
          className="shelf-plank-shadow"
          data-shadow={shadowDepth}
          data-depth={shadowDepth}
        />
      </div>
    </section>
  );
}
