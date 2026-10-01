import { describe, expect, it } from 'vitest';
import { motionPresets, reducedTransition } from './presets.js';

const EASED = ['fade', 'page'];
const SPRUNG = ['springSoft', 'springSheet'];

function collectNumbers(value) {
  if (typeof value === 'number') return [value];
  if (Array.isArray(value)) return value.flatMap(collectNumbers);
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectNumbers);
  }
  return [];
}

describe('motionPresets', () => {
  it('exports exactly the documented preset names', () => {
    expect(Object.keys(motionPresets).sort()).toEqual(['fade', 'page', 'springSheet', 'springSoft']);
  });

  it('exposes every preset as a plain, frozen-safe object', () => {
    for (const [name, preset] of Object.entries(motionPresets)) {
      expect(typeof preset, name).toBe('object');
      expect(preset, name).not.toBeNull();
      expect(Array.isArray(preset), name).toBe(false);
      expect(Object.getPrototypeOf(preset), name).toBe(Object.prototype);
    }
  });

  it('keeps every numeric value finite and strictly positive', () => {
    for (const [name, preset] of Object.entries(motionPresets)) {
      const numbers = collectNumbers(preset);
      expect(numbers.length, name).toBeGreaterThan(0);
      for (const value of numbers) {
        expect(Number.isFinite(value), `${name}: ${value}`).toBe(true);
        expect(value, `${name}: ${value}`).toBeGreaterThan(0);
      }
    }
  });

  it('marks springs as springs with usable stiffness and damping', () => {
    for (const name of SPRUNG) {
      const preset = motionPresets[name];
      expect(preset.type).toBe('spring');
      expect(preset.stiffness).toBeGreaterThan(0);
      expect(preset.damping).toBeGreaterThan(0);
      expect(preset.mass).toBeGreaterThan(0);
      expect(preset.duration, name).toBeUndefined();
    }
  });

  it('gives eased presets a duration and a four-number cubic bezier', () => {
    for (const name of EASED) {
      const preset = motionPresets[name];
      expect(preset.duration).toBeGreaterThan(0);
      expect(preset.ease).toHaveLength(4);
      for (const stop of preset.ease) {
        expect(stop).toBeGreaterThanOrEqual(0);
        expect(stop).toBeLessThanOrEqual(1);
      }
    }
  });

  it('orders the page transition above the fade transition', () => {
    expect(motionPresets.page.duration).toBeGreaterThan(motionPresets.fade.duration);
  });

  it('exposes a near-instant reduced transition', () => {
    expect(reducedTransition).toEqual({ duration: 0.01 });
  });
});
