import { describe, it, expect, vi } from 'vitest';
import { createImportScheduler, getConcurrency } from './importScheduler.js';
import { createManifest, addUnit, UnitStatus } from './documentManifest.js';

describe('importScheduler', () => {
  it('getConcurrency returns at least 1', () => {
    expect(getConcurrency()).toBeGreaterThanOrEqual(1);
    expect(getConcurrency()).toBeLessThanOrEqual(3);
  });

  it('processes a single job', async () => {
    const ready = [];
    const scheduler = createImportScheduler({
      concurrency: 1,
      onUnitReady: (u) => ready.push(u),
    });

    const m = createManifest({ documentId: 'd', kind: 'PDF', totalUnits: 0 });
    const unit = addUnit(m, { label: 'P1' });

    scheduler.enqueue(unit, 0, async () => {
      return { text: 'hello', paragraphs: ['hello'], ocrStatus: 'native' };
    });

    await vi.waitFor(() => expect(ready.length).toBe(1));
    expect(ready[0].status).toBe(UnitStatus.READY);
    expect(ready[0].text).toBe('hello');
    scheduler.cancelAll();
  });

  it('respects concurrency limit', async () => {
    let running = 0;
    let maxRunning = 0;
    const ready = [];

    const scheduler = createImportScheduler({
      concurrency: 2,
      onUnitReady: (u) => ready.push(u),
    });

    const m = createManifest({ documentId: 'd', kind: 'PDF', totalUnits: 0 });
    const units = Array.from({ length: 6 }, (_, i) => addUnit(m, { label: `P${i + 1}` }));

    for (const unit of units) {
      scheduler.enqueue(unit, 3, async (u) => {
        running += 1;
        maxRunning = Math.max(maxRunning, running);
        await new Promise((r) => setTimeout(r, 20));
        running -= 1;
        return { text: u.label, paragraphs: [u.label], ocrStatus: 'native' };
      });
    }

    await vi.waitFor(() => expect(ready.length).toBe(6));
    expect(maxRunning).toBeLessThanOrEqual(2);
    scheduler.cancelAll();
  });

  it('cancels a queued unit', async () => {
    const ready = [];
    const failed = [];
    const scheduler = createImportScheduler({
      concurrency: 1,
      onUnitReady: (u) => ready.push(u),
      onUnitFailed: (u) => failed.push(u),
    });

    const m = createManifest({ documentId: 'd', kind: 'PDF', totalUnits: 0 });
    const u1 = addUnit(m, { label: 'P1' });
    const u2 = addUnit(m, { label: 'P2' });

    // First job runs slowly
    scheduler.enqueue(u1, 0, async () => {
      await new Promise((r) => setTimeout(r, 50));
      return { text: 'slow', paragraphs: ['slow'], ocrStatus: 'native' };
    });
    // Second job is queued
    scheduler.enqueue(u2, 1, async () => {
      return { text: 'fast', paragraphs: ['fast'], ocrStatus: 'native' };
    });

    await new Promise((r) => setTimeout(r, 5));
    scheduler.cancelUnit(u2.id);

    await vi.waitFor(() => expect(ready.length).toBe(1));
    expect(ready[0].id).toBe(u1.id);
    expect(u2.status).toBe(UnitStatus.CANCELLED);
    scheduler.cancelAll();
  });

  it('cancelAll stops all work', async () => {
    const ready = [];
    const scheduler = createImportScheduler({
      concurrency: 2,
      onUnitReady: (u) => ready.push(u),
    });

    const m = createManifest({ documentId: 'd', kind: 'PDF', totalUnits: 0 });
    const units = Array.from({ length: 4 }, (_, i) => addUnit(m, { label: `P${i + 1}` }));

    for (const unit of units) {
      scheduler.enqueue(unit, 0, async () => {
        await new Promise((r) => setTimeout(r, 100));
        return { text: unit.label, paragraphs: [unit.label], ocrStatus: 'native' };
      });
    }

    await new Promise((r) => setTimeout(r, 10));
    scheduler.cancelAll();

    await new Promise((r) => setTimeout(r, 200));
    // Some may have completed before cancel, but no new ones should start
    expect(scheduler.isIdle).toBe(true);
  });

  it('reports stats correctly', () => {
    const scheduler = createImportScheduler({ concurrency: 2 });
    const stats = scheduler.stats();
    expect(stats.active).toBe(0);
    expect(stats.queued).toBe(0);
    expect(stats.maxConcurrency).toBe(2);
    scheduler.cancelAll();
  });
});
