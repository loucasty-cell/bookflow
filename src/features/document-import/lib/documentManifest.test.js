import { describe, it, expect } from 'vitest';
import {
  createManifest,
  addUnit,
  markQueued,
  markReady,
  markFailed,
  markCancelled,
  getUnitById,
  getUnitsByStatus,
  getFirstReadyUnit,
  manifestProgress,
  UnitStatus,
  resetUnitIdCounter,
} from './documentManifest.js';

describe('documentManifest', () => {
  it('creates a manifest with correct defaults', () => {
    const m = createManifest({ documentId: 'doc-1', title: 'Test', author: 'A', kind: 'PDF', totalUnits: 0 });
    expect(m.documentId).toBe('doc-1');
    expect(m.manifestVersion).toBe('1.0.0');
    expect(m.title).toBe('Test');
    expect(m.units).toEqual([]);
    expect(m.totalUnits).toBe(0);
  });

  it('adds units with auto-incremented IDs', () => {
    resetUnitIdCounter();
    const m = createManifest({ documentId: 'd', kind: 'PDF', totalUnits: 0 });
    const u1 = addUnit(m, { label: 'Page 1', sourcePage: 1 });
    const u2 = addUnit(m, { label: 'Page 2', sourcePage: 2 });
    expect(u1.id).not.toBe(u2.id);
    expect(m.units.length).toBe(2);
    expect(m.totalUnits).toBe(2);
  });

  it('marks ready units with text and paragraphs', () => {
    const m = createManifest({ documentId: 'd', kind: 'PDF', totalUnits: 0 });
    const u = addUnit(m, { label: 'P1' });
    expect(u.status).toBe(UnitStatus.UNSEEN);
    markReady(u, { text: 'hello world', paragraphs: ['hello world'], confidence: 90, ocrStatus: 'ocr-ready' });
    expect(u.status).toBe(UnitStatus.READY);
    expect(u.text).toBe('hello world');
    expect(u.confidence).toBe(90);
    expect(u.ocrStatus).toBe('ocr-ready');
  });

  it('marks failed with error message', () => {
    const m = createManifest({ documentId: 'd', kind: 'PDF', totalUnits: 0 });
    const u = addUnit(m, { label: 'P1' });
    markFailed(u, 'timeout');
    expect(u.status).toBe(UnitStatus.FAILED);
    expect(u.error).toBe('timeout');
  });

  it('marks cancelled only for queued/processing units', () => {
    const m = createManifest({ documentId: 'd', kind: 'PDF', totalUnits: 0 });
    const u1 = addUnit(m, { label: 'P1' });
    const u2 = addUnit(m, { label: 'P2' });
    markReady(u1, { text: 'done' });
    markCancelled(u1); // should NOT change READY
    expect(u1.status).toBe(UnitStatus.READY);

    markQueued(u2);
    markCancelled(u2);
    expect(u2.status).toBe(UnitStatus.CANCELLED);
  });

  it('calculates progress correctly', () => {
    const m = createManifest({ documentId: 'd', kind: 'PDF', totalUnits: 0 });
    const u1 = addUnit(m, { label: 'P1' });
    const u2 = addUnit(m, { label: 'P2' });
    const u3 = addUnit(m, { label: 'P3' });
    expect(manifestProgress(m)).toBe(0);
    markReady(u1, { text: 'a' });
    expect(manifestProgress(m)).toBe(33);
    markReady(u2, { text: 'b' });
    expect(manifestProgress(m)).toBe(67);
    markReady(u3, { text: 'c' });
    expect(manifestProgress(m)).toBe(100);
  });

  it('finds unit by ID and by status', () => {
    resetUnitIdCounter();
    const m = createManifest({ documentId: 'd', kind: 'PDF', totalUnits: 0 });
    const u1 = addUnit(m, { label: 'P1' });
    const u2 = addUnit(m, { label: 'P2' });
    expect(getUnitById(m, u1.id)).toBe(u1);
    expect(getUnitById(m, 'nonexistent')).toBeNull();
    markReady(u1, { text: 'a' });
    expect(getUnitsByStatus(m, UnitStatus.READY)).toEqual([u1]);
    expect(getUnitsByStatus(m, UnitStatus.UNSEEN)).toEqual([u2]);
  });

  it('gets first ready unit', () => {
    resetUnitIdCounter();
    const m = createManifest({ documentId: 'd', kind: 'PDF', totalUnits: 0 });
    expect(getFirstReadyUnit(m)).toBeNull();
    const u1 = addUnit(m, { label: 'P1' });
    const u2 = addUnit(m, { label: 'P2' });
    markReady(u2, { text: 'b' });
    expect(getFirstReadyUnit(m)).toBe(u2);
    markReady(u1, { text: 'a' });
    expect(getFirstReadyUnit(m)).toBe(u1); // added first
  });

  it('created units are UNSEEN by default when no text', () => {
    const m = createManifest({ documentId: 'd', kind: 'PDF', totalUnits: 0 });
    const u = addUnit(m, { label: 'P1' });
    expect(u.status).toBe(UnitStatus.UNSEEN);
  });

  it('created units are READY immediately when text is provided', () => {
    const m = createManifest({ documentId: 'd', kind: 'TXT', totalUnits: 0 });
    const u = addUnit(m, { label: 'S1', text: 'hello world', paragraphs: ['hello world'] });
    expect(u.status).toBe(UnitStatus.READY);
  });
});
