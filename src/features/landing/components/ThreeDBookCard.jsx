"use client";

import { useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";

const TILT_SPRING = { stiffness: 240, damping: 24 };
const OPEN_TRANSITION = { duration: 0.3, ease: [0.22, 1, 0.36, 1] };

export function ThreeDBookCard({ book, onOpen, coverColor = "amber", className = "" }) {
  const [isOpening, setIsOpening] = useState(false);
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [9, -9]), TILT_SPRING);
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-13, 13]), TILT_SPRING);

  const handlePointerMove = (event) => {
    if (reduceMotion || isOpening || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  };

  const resetTilt = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  const finishOpening = () => {
    setIsOpening(false);
    onOpen?.(book);
  };

  const handleClick = () => {
    if (!book || !onOpen || isOpening) return;
    if (reduceMotion) {
      onOpen(book);
      return;
    }
    resetTilt();
    setIsOpening(true);
  };

  return (
    <div className={`book-3d-scene ${className}`} data-cover={coverColor}>
      <button
        type="button"
        className="book-3d-prism"
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
        onClick={handleClick}
        aria-label={`Open book: ${book.title}`}
      >
        <span className="book-pull">
          <motion.span
            className="book-volume"
            style={{ rotateX: reduceMotion ? 0 : rotateX, rotateY: reduceMotion ? 0 : rotateY }}
          >
            <span className="book-3d-face book-3d-spine" aria-hidden="true" />
            <span className="book-3d-face book-3d-pages-right" aria-hidden="true" />
            <span className="book-3d-face book-3d-pages-top" aria-hidden="true" />
            <span className="book-3d-face book-3d-endpaper" aria-hidden="true">
              {book.title}
            </span>
            <motion.span
              className="book-3d-face book-3d-front"
              initial={false}
              animate={{ rotateY: isOpening ? -105 : 0 }}
              transition={OPEN_TRANSITION}
              onAnimationComplete={isOpening ? finishOpening : undefined}
            >
              <span className="book-cover-mark" aria-hidden="true" />
              <span className="book-cover-inner">
                <span className="book-title-block">
                  <span className="book-cover-title">{book.title}</span>
                  {book.author && <span className="book-cover-author">{book.author}</span>}
                </span>
                <span className="book-footer-cta" aria-hidden="true">Read</span>
              </span>
            </motion.span>
          </motion.span>
        </span>
      </button>
    </div>
  );
}
