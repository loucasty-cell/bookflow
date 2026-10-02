import { describe, expect, it } from 'vitest';
import { DEFAULT_RATIO, clampPx, snapPx, toPixels, toRatio } from './position.js';

const vp = { width: 1000, height: 700 };
const size = { width: 400, height: 48 };

describe('position', () => {
  it('clamps inside the viewport', () => {
    expect(clampPx({ x: -9, y: -9 }, size, vp)).toEqual({ x: 12, y: 12 });
    expect(clampPx({ x: 9999, y: 9999 }, size, vp)).toEqual({ x: 588, y: 640 });
  });

  it('handles NaN and tiny viewports', () => {
    const r = clampPx({ x: NaN, y: NaN }, { width: 900, height: 48 }, { width: 320, height: 500 });
    expect(Number.isFinite(r.x) && Number.isFinite(r.y)).toBe(true);
  });

  it('round-trips ratio and pixels', () => {
    const r = toRatio(toPixels({ fx: 0.25, fy: 0.5 }, size, vp), size, vp);
    expect(r.fx).toBeCloseTo(0.25);
    expect(r.fy).toBeCloseTo(0.5);
  });

  it('default is bottom centre', () => {
    const p = toPixels(DEFAULT_RATIO, size, vp);
    expect(p.x).toBe(300);
    expect(p.y).toBe(640);
  });

  it('snaps near edges', () => {
    expect(snapPx({ x: 20, y: 300 }, size, vp).x).toBe(12);
  });
});

describe('position beyond the supplied cases', () => {
  it('centres horizontally and pins to the bottom by default', () => {
    const p = toPixels(DEFAULT_RATIO, size, vp);
    const centre = p.x + size.width / 2;
    expect(centre).toBe(vp.width / 2);
    expect(p.y + size.height + 12).toBe(vp.height);
  });

  it('clamps a ratio outside 0..1 back into range', () => {
    const high = toPixels({ fx: 5, fy: -3 }, size, vp);
    expect(high.x).toBe(588);
    expect(high.y).toBe(12);
  });

  it('centres when the bar is wider than the viewport', () => {
    const narrow = { width: 320, height: 640 };
    const wide = { width: 900, height: 48 };
    const r = toRatio({ x: 100, y: 100 }, wide, narrow);
    expect(r.fx).toBe(0.5);
    const px = toPixels(r, wide, narrow);
    expect(px.x).toBe(12);
  });

  it('snaps to the right and bottom edges too', () => {
    expect(snapPx({ x: 900, y: 690 }, size, vp)).toEqual({ x: 588, y: 640 });
  });

  it('leaves a position alone when it is not within the snap threshold', () => {
    expect(snapPx({ x: 400, y: 300 }, size, vp)).toEqual({ x: 400, y: 300 });
  });

  it('survives a hostile ratio payload by landing in bounds', () => {
    const r = toRatio({ x: NaN, y: undefined }, size, vp);
    expect(Number.isFinite(r.fx)).toBe(true);
    expect(Number.isFinite(r.fy)).toBe(true);
    expect(r.fx).toBe(0);
    expect(r.fy).toBe(0);
  });

  it('falls back to centred-bottom when there is no room to move', () => {
    const narrow = { width: 320, height: 200 };
    const wide = { width: 900, height: 480 };
    const r = toRatio({ x: 50, y: 50 }, wide, narrow);
    expect(r.fx).toBe(0.5);
    expect(r.fy).toBe(1);
  });
});
