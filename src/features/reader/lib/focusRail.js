/**
 * Focus rail selection.
 *
 * This runs on every scroll frame, so it is the hottest path in the reader.
 * Paragraph tops are already in document order, so re-sorting the list on every
 * frame to rediscover that order is wasted work. The ordered list is cached
 * against the input array identity, and the active paragraph is then found with
 * a binary search instead of a linear scan.
 *
 * Ordering falls back to a sort when the input is genuinely out of order, so
 * the selection result is identical to the previous implementation.
 */

let orderCache = new WeakMap();

const EMPTY_ENTRY = { sourceLength: 0, ordered: [], stacked: true };

function measure(list) {
  const measured = [];
  for (let index = 0; index < list.length; index += 1) {
    const paragraph = list[index];
    if (!paragraph || !Number.isFinite(paragraph.top) || !Number.isFinite(paragraph.bottom)) continue;
    measured.push(paragraph);
  }
  return measured;
}

function isOrdered(list) {
  for (let index = 1; index < list.length; index += 1) {
    const previous = list[index - 1];
    const current = list[index];
    if (previous.top > current.top) return false;
    if (previous.top === current.top && previous.left > current.left) return false;
  }
  return true;
}

/**
 * Stacked paragraphs have non decreasing bottoms, which makes the set that
 * crosses the anchor a contiguous run. Overlapping blocks break that, so the
 * flag decides between a binary search and an exact linear scan.
 */
function hasStackedBottoms(list) {
  for (let index = 1; index < list.length; index += 1) {
    if (list[index - 1].bottom > list[index].bottom) return false;
  }
  return true;
}

function byPosition(first, second) {
  return first.top - second.top || first.left - second.left || String(first.id ?? '').localeCompare(String(second.id ?? ''));
}

function orderedParagraphs(paragraphs) {
  const list = Array.isArray(paragraphs) ? paragraphs : null;
  if (!list) return EMPTY_ENTRY;

  const cached = orderCache.get(list);
  if (cached && cached.sourceLength === list.length) return cached;

  const measured = measure(list);
  const ordered = isOrdered(measured) ? measured : measured.slice().sort(byPosition);

  const entry = { sourceLength: list.length, ordered, stacked: hasStackedBottoms(ordered) };
  orderCache.set(list, entry);
  return entry;
}

/** Index of the last paragraph whose top is at or above the anchor, or -1. */
function lastAtOrAbove(ordered, anchorY) {
  let low = 0;
  let high = ordered.length - 1;
  let result = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (ordered[mid].top <= anchorY) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return result;
}

function preferCurrent(paragraphs, currentId) {
  return paragraphs.find((paragraph) => paragraph.id === currentId) ?? paragraphs[0];
}

export function selectClosestParagraph(paragraphs, anchorY, currentId = '') {
  const entry = orderedParagraphs(paragraphs);
  const ordered = entry.ordered;
  const length = ordered.length;
  if (!length) return null;

  const anchor = Number.isFinite(anchorY) ? anchorY : 0;

  if (!entry.stacked) {
    const crossing = [];
    for (let index = 0; index < length; index += 1) {
      const paragraph = ordered[index];
      if (paragraph.top <= anchor && paragraph.bottom >= anchor) crossing.push(paragraph);
    }
    if (crossing.length) return preferCurrent(crossing, currentId);
  } else {
    const candidate = lastAtOrAbove(ordered, anchor);
    if (candidate >= 0 && ordered[candidate].bottom >= anchor) {
      // Paragraphs after the search point have top > anchor, so they can never
      // satisfy the crossing test. The crossing set is a contiguous run that
      // ends at the search point and extends backwards.
      let start = candidate;
      while (start > 0 && ordered[start - 1].bottom >= anchor) start -= 1;
      if (candidate > start) {
        return preferCurrent(ordered.slice(start, candidate + 1), currentId);
      }
      return ordered[candidate];
    }
  }

  let closest = ordered[0];
  let closestDistance = Math.abs((closest.top + closest.bottom) / 2 - anchor);
  for (let cursor = 1; cursor < length; cursor += 1) {
    const paragraph = ordered[cursor];
    const distance = Math.abs((paragraph.top + paragraph.bottom) / 2 - anchor);
    if (distance < closestDistance) {
      closest = paragraph;
      closestDistance = distance;
      if (distance === 0) break;
    }
  }
  return closest;
}

export function selectNextParagraph(paragraphs, currentId, direction, step = 1) {
  const { ordered } = orderedParagraphs(paragraphs);
  const length = ordered.length;
  if (!length) return null;

  const safeStep = Number.isFinite(Number(step)) ? Math.max(1, Math.round(Number(step))) : 1;
  const sign = Math.sign(direction) || 1;

  let currentIndex = -1;
  for (let index = 0; index < length; index += 1) {
    if (ordered[index].id === currentId) {
      currentIndex = index;
      break;
    }
  }

  const startIndex = currentIndex < 0 ? (sign > 0 ? -1 : length) : currentIndex;
  const nextIndex = Math.min(length - 1, Math.max(0, startIndex + sign * safeStep));
  return ordered[nextIndex];
}

export function selectFocusTarget(paragraphs, railY, currentId = '') {
  return selectClosestParagraph(paragraphs, railY, currentId);
}
