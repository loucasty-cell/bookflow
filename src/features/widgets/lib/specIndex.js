import { appleSmallMedium } from './spec/appleSmallMedium.js';
import { appleLarge } from './spec/appleLarge.js';
import { productivity } from './spec/productivity.js';
import { parts } from './spec/parts.js';

export { appleSmallMedium, appleLarge, productivity, parts };

export const widgetSpec = [...appleSmallMedium, ...appleLarge, ...productivity, ...parts];

export function findWidgetById(id) {
  return widgetSpec.find((entry) => entry.id === id) ?? null;
}

export function widgetsBySize(size) {
  return widgetSpec.filter((entry) => entry.size === size);
}
