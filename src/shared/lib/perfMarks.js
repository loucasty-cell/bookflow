const MARK_PREFIX = "bookflow:";

export function mark(name) {
  try {
    performance.mark(`${MARK_PREFIX}${name}`);
  } catch {
    // Performance API unavailable or duplicate mark — silent no-op.
  }
}

export function measure(name, startMark, endMark) {
  try {
    const start = `${MARK_PREFIX}${startMark}`;
    const end = `${MARK_PREFIX}${endMark}`;
    performance.measure(`${MARK_PREFIX}${name}`, start, end);
    const entries = performance.getEntriesByName(`${MARK_PREFIX}${name}`);
    return entries.length ? entries[entries.length - 1].duration : null;
  } catch {
    return null;
  }
}

export function getMarks() {
  try {
    return performance
      .getEntriesByType("mark")
      .filter((e) => e.name.startsWith(MARK_PREFIX))
      .map((e) => ({ name: e.name.replace(MARK_PREFIX, ""), startTime: e.startTime }));
  } catch {
    return [];
  }
}

export function getMeasures() {
  try {
    return performance
      .getEntriesByType("measure")
      .filter((e) => e.name.startsWith(MARK_PREFIX))
      .map((e) => ({ name: e.name.replace(MARK_PREFIX, ""), duration: e.duration }));
  } catch {
    return [];
  }
}

export function clearMarks() {
  try {
    performance
      .getEntriesByType("mark")
      .filter((e) => e.name.startsWith(MARK_PREFIX))
      .forEach((e) => performance.clearMarks(e.name));
    performance
      .getEntriesByType("measure")
      .filter((e) => e.name.startsWith(MARK_PREFIX))
      .forEach((e) => performance.clearMeasures(e.name));
  } catch {
    // no-op
  }
}
