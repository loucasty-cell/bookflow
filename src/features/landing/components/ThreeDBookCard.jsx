import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { BookOpen, Sparkles } from "lucide-react";

/**
 * ThreeDBookCard: Hardware-accelerated 3D physical book component.
 * Features 3D prism construction (front cover, spine, page edges, shadow),
 * pointer-following specular highlight sheen, and smooth spring physics.
 */
export function ThreeDBookCard({
  book,
  onOpen,
  badge = "Featured",
  coverColor = "amber",
  className = "",
}) {
  const cardRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const openTimerRef = useRef(null);

  useEffect(() => () => {
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
  }, []);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // 120fps fluid spring physics
  const springConfig = { stiffness: 280, damping: 22 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-14, 14]), springConfig);
  const specularX = useTransform(mouseX, [-0.5, 0.5], ["10%", "90%"]);
  const specularY = useTransform(mouseY, [-0.5, 0.5], ["10%", "90%"]);

  const handleMouseMove = (e) => {
    if (!cardRef.current || isOpening) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseEnter = () => {
    if (!isOpening) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  const handleClick = () => {
    if (!book || isOpening) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (!onOpen) return;
    if (reduceMotion) {
      onOpen(book);
      return;
    }
    setIsOpening(true);
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      setIsOpening(false);
      onOpen(book);
    }, 360);
  };

  const colorThemes = {
    amber: {
      bg: "linear-gradient(145deg, #78350f, #451a03)",
      spine: "#291204",
      border: "rgba(251, 191, 36, 0.25)",
      text: "#fef3c7",
      accent: "#f59e0b",
    },
    navy: {
      bg: "linear-gradient(145deg, #1e3a8a, #0f172a)",
      spine: "#0a0f1d",
      border: "rgba(96, 165, 250, 0.25)",
      text: "#eff6ff",
      accent: "#3b82f6",
    },
    emerald: {
      bg: "linear-gradient(145deg, #064e3b, #022c22)",
      spine: "#011c15",
      border: "rgba(52, 211, 153, 0.25)",
      text: "#ecfdf5",
      accent: "#10b981",
    },
    burgundy: {
      bg: "linear-gradient(145deg, #701a28, #3b0711)",
      spine: "#220308",
      border: "rgba(244, 63, 94, 0.25)",
      text: "#fff1f2",
      accent: "#f43f5e",
    },
  };

  const theme = colorThemes[coverColor] || colorThemes.amber;

  return (
    <div
      className={`book-3d-scene ${className}`}
      style={{ perspective: "1200px" }}
    >
      <motion.div
        ref={cardRef}
        className={`book-3d-prism ${isOpening ? "is-opening-book" : ""}`}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{
          rotateX: isOpening ? 0 : rotateX,
          rotateY: isOpening ? -25 : rotateY,
          transformStyle: "preserve-3d",
        }}
        whileHover={{ scale: 1.03, z: 32 }}
        whileTap={{ scale: 0.98, z: -8 }}
        tabIndex={0}
        role="button"
        aria-label={`Open book: ${book?.title ?? "untitled"}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {/* Front Cover Face */}
        <div
          className="book-3d-face book-3d-front"
          style={{
            background: theme.bg,
            borderColor: theme.border,
            color: theme.text,
          }}
        >
          {/* Embossed Book Cover Ornamentation */}
          <div className="book-cover-inner">
            <div className="book-header-badge">
              <Sparkles size={12} color={theme.accent} />
              <span>{badge}</span>
            </div>

            <div className="book-title-block">
              <h3 className="book-cover-title">{book.title}</h3>
              <p className="book-cover-author">{book.author || "A Bookflow classic"}</p>
            </div>

            <div className="book-footer-cta">
              <span className="book-cta-text">
                <BookOpen size={14} /> Open Book
              </span>
              <span className="book-section-count">
                {book.chapters?.length || 3} sections
              </span>
            </div>
          </div>

          {/* Dynamic Specular Sheen on Hover */}
          {isHovered && !isOpening && (
            <motion.div
              className="book-specular-sheen"
              style={{
                left: specularX,
                top: specularY,
              }}
              aria-hidden="true"
            />
          )}

          {/* Leather/Cloth Grain Texture Overlay */}
          <div className="book-texture-grain" aria-hidden="true" />
        </div>

        {/* 3D Physical Spine */}
        <div
          className="book-3d-face book-3d-spine"
          style={{
            backgroundColor: theme.spine,
            borderRight: `1px solid ${theme.border}`,
          }}
          aria-hidden="true"
        >
          <span className="spine-title-vertical">{book.title}</span>
        </div>

        {/* 3D Page Edges (Top & Right) */}
        <div className="book-3d-face book-3d-pages-right" aria-hidden="true" />
        <div className="book-3d-face book-3d-pages-top" aria-hidden="true" />

        {/* Realistic Ambient Contact Shadow */}
        <div className="book-3d-shadow" aria-hidden="true" />
      </motion.div>
    </div>
  );
}
