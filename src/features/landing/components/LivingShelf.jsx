import { Plus, Sparkles } from "lucide-react";
import { ThreeDBookCard } from "./ThreeDBookCard.jsx";
import { SAMPLE_BOOK } from "../sampleBook.js";

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
  return (
    <section className="living-shelf-section" aria-label="Interactive 3D Bookshelf">
      <div className="living-shelf-header">
        <div className="shelf-eyebrow">
          <Sparkles size={14} />
          <span>Interactive 3D Living Library</span>
        </div>
        <h2 className="shelf-title">Pick a volume or drop your own</h2>
        <p className="shelf-subtitle">
          Hover to explore tactile depth. All documents open instantly and remain 100% private to your device.
        </p>
      </div>

      <div className="living-shelf-grid">
        {CURATED_LIBRARY.map((bookItem, idx) => (
          <ThreeDBookCard
            key={`${bookItem.title}-${idx}`}
            book={bookItem}
            badge={bookItem.badge}
            coverColor={bookItem.coverColor}
            onOpen={onOpenBook}
          />
        ))}

        {/* 3D Add Custom Book Card */}
        <div className="book-3d-scene" style={{ perspective: "1200px" }}>
          <div
            className="book-3d-prism book-3d-add-card"
            onClick={onUploadClick}
            role="button"
            tabIndex={0}
            aria-label="Upload custom book"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onUploadClick();
              }
            }}
          >
            <div className="add-card-inner">
              <div className="add-icon-bubble">
                <Plus size={26} />
              </div>
              <h4>Import File</h4>
              <p>PDF, EPUB, TXT, MD</p>
              <span className="add-privacy-tag">Zero Cloud Transfer</span>
            </div>
          </div>
        </div>
      </div>

      {/* Physical 3D Wooden/Linen Shelf Plank */}
      <div className="living-shelf-plank" aria-hidden="true">
        <div className="shelf-plank-top" />
        <div className="shelf-plank-edge" />
        <div className="shelf-plank-shadow" />
      </div>
    </section>
  );
}
