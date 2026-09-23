/**
 * DocumentManifest: per-unit state tracking for progressive import.
 *
 * A manifest is created immediately after file validation, before full parsing.
 * Each unit (PDF page, EPUB spine item, text section) has an explicit lifecycle:
 *   UNSEEN -> QUEUED -> PROCESSING -> READY | FAILED -> CANCELLED
 *
 * The manifest is the single source of truth for what has been parsed,
 * what needs OCR, and what is ready to read.
 */

export const UnitStatus = Object.freeze({
  UNSEEN: "UNSEEN",
  QUEUED: "QUEUED",
  PROCESSING: "PROCESSING",
  READY: "READY",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
});

export const JobPriority = Object.freeze({
  CURRENT: 0,
  NEXT: 1,
  PREVIOUS: 2,
  BACKGROUND: 3,
});

let nextUnitId = 0;

function makeUnitId() {
  nextUnitId += 1;
  return `unit-${nextUnitId}`;
}

export function resetUnitIdCounter() {
  nextUnitId = 0;
}

export function createManifest({ documentId, title, author, kind, totalUnits }) {
  return {
    documentId,
    manifestVersion: "1.0.0",
    title: title || "Untitled",
    author: author || null,
    kind,
    totalUnits,
    createdAt: Date.now(),
    units: [],
  };
}

export function addUnit(manifest, { label, sourcePage, kind, text, paragraphs, estimatedSeconds, ocrStatus }) {
  const unit = {
    id: makeUnitId(),
    label: label || `Unit ${manifest.units.length + 1}`,
    sourcePage: sourcePage ?? null,
    kind: kind || "TEXT",
    text: text || null,
    paragraphs: paragraphs || null,
    estimatedSeconds: estimatedSeconds || 0,
    ocrStatus: ocrStatus || "native",
    status: text ? UnitStatus.READY : UnitStatus.UNSEEN,
    confidence: null,
    error: null,
  };
  manifest.units.push(unit);
  manifest.totalUnits = manifest.units.length;
  return unit;
}

export function markQueued(unit) {
  if (unit.status === UnitStatus.UNSEEN) {
    unit.status = UnitStatus.QUEUED;
  }
}

export function markProcessing(unit) {
  if (unit.status === UnitStatus.QUEUED || unit.status === UnitStatus.UNSEEN) {
    unit.status = UnitStatus.PROCESSING;
  }
}

export function markReady(unit, { text, paragraphs, confidence, ocrStatus } = {}) {
  if (
    unit.status === UnitStatus.READY ||
    unit.status === UnitStatus.CANCELLED ||
    unit.status === UnitStatus.FAILED
  ) {
    return;
  }
  unit.status = UnitStatus.READY;
  if (text != null) unit.text = text;
  if (paragraphs != null) unit.paragraphs = paragraphs;
  if (confidence != null) unit.confidence = confidence;
  if (ocrStatus != null) unit.ocrStatus = ocrStatus;
  unit.error = null;
}

export function markFailed(unit, error) {
  unit.status = UnitStatus.FAILED;
  unit.error = typeof error === "string" ? error : error?.message || "Processing failed";
}

export function markCancelled(unit) {
  if (unit.status === UnitStatus.QUEUED || unit.status === UnitStatus.PROCESSING) {
    unit.status = UnitStatus.CANCELLED;
  }
}

export function requeueUnit(unit) {
  if (unit.status === UnitStatus.CANCELLED) {
    unit.status = UnitStatus.UNSEEN;
    unit.error = null;
  }
}

export function getUnitById(manifest, unitId) {
  return manifest.units.find((u) => u.id === unitId) || null;
}

export function getUnitsByStatus(manifest, status) {
  return manifest.units.filter((u) => u.status === status);
}

export function getReadyUnits(manifest) {
  return getUnitsByStatus(manifest, UnitStatus.READY);
}

export function getFirstReadyUnit(manifest) {
  return manifest.units.find((u) => u.status === UnitStatus.READY) || null;
}

export function manifestProgress(manifest) {
  if (!manifest.units.length) return 0;
  const settled = manifest.units.filter(
    (u) => u.status === UnitStatus.READY || u.status === UnitStatus.FAILED || u.status === UnitStatus.CANCELLED,
  ).length;
  return Math.round((settled / manifest.units.length) * 100);
}

export function manifestReadiness(manifest) {
  if (!manifest.units.length) return 0;
  const ready = manifest.units.filter((u) => u.status === UnitStatus.READY).length;
  return Math.round((ready / manifest.units.length) * 100);
}
