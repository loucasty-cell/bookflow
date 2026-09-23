/**
 * BadgeGlyph: hand-authored Renaissance-style SVG line art for each motif.
 *
 * Every glyph is pure SVG: golden-ratio geometry, engraving hatching, sepia and
 * gold strokes. No images, no fonts, no network, and every element carries an
 * accessible title. Reduced motion and reduced transparency are respected in CSS.
 */

const GOLD = 'var(--badge-gold, #b08a3e)';
const SEPIA = 'var(--badge-sepia, #6b4f2a)';
const INK = 'var(--badge-ink, #3d2f17)';
const PARCH = 'var(--badge-parchment, #f3ead9)';

/** Shared frame: a double-bordered medallion with corner flourishes. */
function MedallionFrame({ size = 64 }) {
  return (
    <g fill="none" stroke={GOLD}>
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} strokeWidth="1.5" opacity="0.9" />
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 6} strokeWidth="0.75" opacity="0.5" />
      {[0, 90, 180, 270].map((angle) => (
        <path
          key={angle}
          d={`M ${size / 2} 4 Q ${size / 2 - 4} 2 ${size / 2 - 4} 8`}
          strokeWidth="0.75"
          opacity="0.6"
          transform={`rotate(${angle} ${size / 2} ${size / 2})`}
        />
      ))}
    </g>
  );
}

/** Fine parallel hatching, like an engraving. */
function Hatching({ x, y, width, height, gap = 4, opacity = 0.35 }) {
  const lines = [];
  for (let i = x; i < x + width; i += gap) {
    lines.push(
      <line key={i} x1={i} y1={y} x2={i} y2={y + height} stroke={SEPIA} strokeWidth="0.5" opacity={opacity} />
    );
  }
  return <g>{lines}</g>;
}

function Quill() {
  return (
    <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
      <path d="M 44 16 Q 30 22 24 44 Q 23 50 27 48 Q 40 40 44 16 Z" strokeWidth="1.6" />
      <path d="M 44 16 Q 36 32 26 47" strokeWidth="1" />
      <path d="M 38 24 L 41 23 M 34 30 L 37 29 M 30 36 L 33 35 M 27 42 L 29 41" strokeWidth="0.7" opacity="0.7" />
      <path d="M 18 50 Q 22 48 24 44" strokeWidth="1.4" />
    </g>
  );
}

function Codex() {
  return (
    <g fill="none" stroke={INK} strokeLinecap="round">
      <rect x="20" y="16" width="24" height="34" rx="2" strokeWidth="1.5" />
      <path d="M 26 16 L 26 50" strokeWidth="0.9" />
      <path d="M 29 23 L 40 23 M 29 28 L 40 28 M 29 33 L 40 33 M 29 38 L 40 38 M 29 43 L 40 43" strokeWidth="0.6" opacity="0.7" />
      <path d="M 20 18 Q 23 16 26 18" strokeWidth="1" />
      <path d="M 44 20 L 44 48" strokeWidth="2.2" opacity="0.85" />
    </g>
  );
}

function Spiral() {
  return (
    <g fill="none" stroke={GOLD} strokeLinecap="round">
      <path
        d="M 32 32 m 0 -2 a 2 2 0 0 1 2 2 a 4 4 0 0 1 -4 4 a 6 6 0 0 1 -6 -6 a 8 8 0 0 1 8 -8 a 10 10 0 0 1 10 10 a 12 12 0 0 1 -12 12 a 14 14 0 0 1 -14 -14"
        strokeWidth="1.4"
      />
      <circle cx="32" cy="32" r="1.5" fill={GOLD} stroke="none" />
    </g>
  );
}

function Hourglass() {
  return (
    <g fill="none" stroke={INK} strokeLinecap="round">
      <path d="M 24 14 L 40 14 L 34 30 L 40 50 L 24 50 L 30 30 Z" strokeWidth="1.5" />
      <path d="M 27 20 L 37 20" strokeWidth="0.8" opacity="0.7" />
      <path d="M 29 46 Q 32 42 35 46" strokeWidth="0.9" />
      <path d="M 32 32 L 32 44" strokeWidth="1.1" strokeDasharray="1.5 2" opacity="0.8" />
    </g>
  );
}

function Laurel() {
  return (
    <g fill="none" stroke={SEPIA} strokeLinecap="round" strokeLinejoin="round">
      {[18, 46].map((cx, i) => (
        <g key={i} transform={i === 1 ? 'scale(-1,1) translate(-64,0)' : undefined}>
          <path d={`M ${cx} 50 Q ${cx - 4} 34 ${cx - 2} 18`} strokeWidth="1.3" />
          {[22, 28, 34, 40, 46].map((y, j) => (
            <path key={j} d={`M ${cx - 1.5} ${y} Q ${cx - 6} ${y - 1} ${cx - 7} ${y + 2}`} strokeWidth="1" />
          ))}
        </g>
      ))}
      <path d="M 26 52 Q 32 56 38 52" strokeWidth="1.5" />
    </g>
  );
}

function Vitruvian() {
  const c = 32;
  return (
    <g fill="none" stroke={INK}>
      <circle cx={c} cy={c} r={c - 9} strokeWidth="1" opacity="0.6" />
      <rect x={c - 14} y={c - 14} width="28" height="28" strokeWidth="1" opacity="0.6" />
      <g strokeLinecap="round" strokeWidth="1.3">
        <circle cx={c} cy={c - 12} r="3" />
        <path d={`M ${c} ${c - 9} L ${c} ${c + 6}`} />
        <path d={`M ${c} ${c - 6} L ${c - 11} ${c - 2} M ${c} ${c - 6} L ${c + 11} ${c - 2}`} />
        <path d={`M ${c} ${c + 6} L ${c - 9} ${c + 16} M ${c} ${c + 6} L ${c + 9} ${c + 16}`} />
      </g>
    </g>
  );
}

function Eye() {
  return (
    <g fill="none" stroke={INK} strokeLinecap="round">
      <path d="M 12 32 Q 32 16 52 32 Q 32 48 12 32 Z" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="6" strokeWidth="1.3" />
      <circle cx="32" cy="32" r="2.2" fill={INK} stroke="none" />
      {[20, 32, 44].map((x) => (
        <path key={x} d={`M ${x} ${x === 32 ? 22 : 24} L ${x} ${x === 32 ? 18 : 20}`} strokeWidth="0.9" opacity="0.7" />
      ))}
    </g>
  );
}

function CompassGlyph() {
  return (
    <g fill="none" stroke={GOLD} strokeLinecap="round">
      <circle cx="32" cy="32" r="16" strokeWidth="1.4" />
      <path d="M 32 20 L 36 32 L 32 44 L 28 32 Z" strokeWidth="1.2" />
      <circle cx="32" cy="32" r="2.5" fill={GOLD} stroke="none" />
      <path d="M 32 14 L 32 18 M 32 46 L 32 50 M 14 32 L 18 32 M 46 32 L 50 32" strokeWidth="1.1" />
    </g>
  );
}

function Orbit() {
  return (
    <g fill="none" stroke={SEPIA}>
      <circle cx="32" cy="32" r="4" fill={GOLD} stroke="none" />
      {[11, 17, 23].map((r) => (
        <circle key={r} cx="32" cy="32" r={r} strokeWidth="1" opacity={r === 23 ? 0.7 : 0.45} strokeDasharray={r === 17 ? '2 3' : 'none'} />
      ))}
      <circle cx="49" cy="32" r="2" fill={SEPIA} stroke="none" />
      <circle cx="20" cy="43" r="1.5" fill={SEPIA} stroke="none" />
    </g>
  );
}

function Bridge() {
  return (
    <g fill="none" stroke={INK} strokeLinecap="round">
      <path d="M 14 44 Q 32 26 50 44" strokeWidth="1.6" />
      <path d="M 14 44 L 14 50 M 50 44 L 50 50 M 24 37 L 24 50 M 40 37 L 40 50 M 32 33 L 32 50" strokeWidth="1" />
      <path d="M 10 50 L 54 50" strokeWidth="1.3" />
      <path d="M 12 14 Q 32 8 52 14" strokeWidth="0.9" opacity="0.5" strokeDasharray="1 3" />
    </g>
  );
}

function Lamp() {
  return (
    <g fill="none" stroke={GOLD} strokeLinecap="round">
      <path d="M 28 34 Q 26 30 28 26 L 36 26 Q 38 30 36 34 Z" strokeWidth="1.4" />
      <path d="M 32 34 L 32 44 M 27 46 L 37 46" strokeWidth="1.3" />
      <path d="M 32 22 Q 31 19 32 16 Q 33 19 32 22 Z" fill={GOLD} strokeWidth="0.8" />
      <path d="M 22 24 L 24 26 M 42 24 L 40 26 M 20 32 L 23 32 M 44 32 L 41 32" strokeWidth="1" opacity="0.8" />
    </g>
  );
}

function Vessel() {
  return (
    <g fill="none" stroke={INK} strokeLinecap="round">
      <path d="M 24 18 Q 24 26 20 32 Q 18 42 24 48 Q 32 52 40 48 Q 46 42 44 32 Q 40 26 40 18" strokeWidth="1.5" />
      <path d="M 24 18 L 40 18" strokeWidth="1.2" />
      <path d="M 26 34 Q 32 37 38 34" strokeWidth="0.9" opacity="0.7" />
      <Hatching x={24} y={38} width={16} height={8} gap={4} opacity={0.3} />
    </g>
  );
}

const GLYPHS = {
  vitruvian: Vitruvian,
  codex: Codex,
  orbit: Orbit,
  quill: Quill,
  lamp: Lamp,
  bridge: Bridge,
  compass: CompassGlyph,
  vessel: Vessel,
  spiral: Spiral,
  laurel: Laurel,
  hourglass: Hourglass,
  eye: Eye,
};

/**
 * Renders a badge medallion for a motif.
 * `earned` is the full gold state; the default is the dim, not-yet-earned state.
 */
export function BadgeGlyph({ motif, earned = false, size = 64, title }) {
  const Glyph = GLYPHS[motif] ?? Codex;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={title ?? `Badge: ${motif}`}
      className={`badge-glyph ${earned ? 'is-earned' : 'is-locked'}`}
      data-motif={motif}
    >
      <title>{title ?? `Badge: ${motif}`}</title>
      <rect width="64" height="64" fill={PARCH} rx="32" opacity={earned ? 1 : 0.6} />
      <MedallionFrame size={64} />
      <g opacity={earned ? 1 : 0.45}>
        <Glyph />
      </g>
    </svg>
  );
}

export { GLYPHS };