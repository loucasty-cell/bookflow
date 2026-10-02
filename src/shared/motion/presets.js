/**
 * motionPresets: shared motion vocabulary.
 *
 * Values mirror the CSS layer in src/styles/tokens.css so JS and CSS stay in
 * step. Keep this the single source: do not inline new easings at call sites.
 */

export const motionPresets = {
  springSoft: { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 },
  springSheet: { type: 'spring', stiffness: 340, damping: 34, mass: 0.86 },
  fade: { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] },
  page: { duration: 0.52, ease: [0.16, 1, 0.3, 1] },
};

export const reducedTransition = { duration: 0.01 };
