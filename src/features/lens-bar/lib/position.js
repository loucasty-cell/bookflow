export const MARGIN = 12;

export function clamp(v, min, max) {
  if (!Number.isFinite(v)) return min;
  return Math.min(Math.max(v, min), Math.max(min, max));
}

export function toPixels(ratio, size, vp, margin = MARGIN) {
  const rangeX = Math.max(0, vp.width - size.width - margin * 2);
  const rangeY = Math.max(0, vp.height - size.height - margin * 2);
  return {
    x: margin + clamp(ratio.fx, 0, 1) * rangeX,
    y: margin + clamp(ratio.fy, 0, 1) * rangeY,
  };
}

export function toRatio(pos, size, vp, margin = MARGIN) {
  const rangeX = vp.width - size.width - margin * 2;
  const rangeY = vp.height - size.height - margin * 2;
  return {
    fx: rangeX > 0 ? clamp((pos.x - margin) / rangeX, 0, 1) : 0.5,
    fy: rangeY > 0 ? clamp((pos.y - margin) / rangeY, 0, 1) : 1,
  };
}

export function clampPx(pos, size, vp, margin = MARGIN) {
  return {
    x: clamp(pos.x, margin, vp.width - size.width - margin),
    y: clamp(pos.y, margin, vp.height - size.height - margin),
  };
}

export function snapPx(pos, size, vp, threshold = 24, margin = MARGIN) {
  const out = { ...pos };
  if (pos.x - margin < threshold) out.x = margin;
  else if (vp.width - (pos.x + size.width) - margin < threshold) out.x = vp.width - size.width - margin;
  if (pos.y - margin < threshold) out.y = margin;
  else if (vp.height - (pos.y + size.height) - margin < threshold) out.y = vp.height - size.height - margin;
  return out;
}

export const DEFAULT_RATIO = { fx: 0.5, fy: 1 };
