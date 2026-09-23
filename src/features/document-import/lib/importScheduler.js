/**
 * ImportScheduler: bounded-priority job queue with AbortController cancellation.
 *
 * Priority order: CURRENT > NEXT > PREVIOUS > BACKGROUND.
 * Concurrency is bounded (default 2 on desktop, 1 on mobile).
 * Stale jobs are cancelled when the user jumps to a different reading position.
 */

import { JobPriority, UnitStatus, markQueued, markProcessing, markReady, markFailed, markCancelled, requeueUnit } from "./documentManifest.js";

const isMobileDevice = () =>
  typeof navigator !== "undefined" &&
  /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

export function getConcurrency() {
  if (typeof navigator === "undefined") return 2;
  if (isMobileDevice()) return 1;
  const cores = navigator.hardwareConcurrency || 2;
  return Math.min(3, Math.max(1, Math.floor(cores / 2)));
}

export function createImportScheduler({ concurrency, onUnitReady, onUnitFailed, onProgress } = {}) {
  const maxConcurrency = concurrency ?? getConcurrency();
  const abortControllers = new Map(); // unitId -> AbortController
  const jobQueue = []; // sorted by priority then insertion order
  let activeCount = 0;
  let disposed = false;

  function enqueue(unit, priority, processFn) {
    if (disposed) return;
    if (unit.status === UnitStatus.READY || unit.status === UnitStatus.FAILED) return;
    requeueUnit(unit);

    // Remove existing entry for same unit (re-enqueue at higher priority)
    const existingIdx = jobQueue.findIndex((j) => j.unit.id === unit.id);
    if (existingIdx !== -1) {
      const existing = jobQueue[existingIdx];
      if (priority <= existing.priority) {
        // Higher or equal priority — update priority
        jobQueue.splice(existingIdx, 1);
      } else {
        // Lower priority — don't downgrade
        return;
      }
    }

    markQueued(unit);
    jobQueue.push({ unit, priority, processFn });
    jobQueue.sort((a, b) => a.priority - b.priority);
    drain();
  }

  function drain() {
    while (activeCount < maxConcurrency && jobQueue.length > 0) {
      const job = jobQueue.shift();
      if (job.unit.status === UnitStatus.CANCELLED || job.unit.status === UnitStatus.READY) {
        continue;
      }
      runJob(job).catch(() => undefined);
    }
  }

  async function runJob(job) {
    activeCount += 1;
    const { unit, processFn } = job;
    const controller = new AbortController();
    abortControllers.set(unit.id, { controller, unit });

    markProcessing(unit);

    const settleCancelled = () => {
      if (unit.status === UnitStatus.QUEUED) return;
      markCancelled(unit);
    };

    try {
      const result = await processFn(unit, controller.signal);
      if (controller.signal.aborted || unit.status === UnitStatus.CANCELLED) {
        settleCancelled();
      } else if (result == null) {
        markFailed(unit, new Error("Processing produced no readable content."));
        onUnitFailed?.(unit);
      } else {
        markReady(unit, result);
        onUnitReady?.(unit);
      }
    } catch (err) {
      if (controller.signal.aborted || unit.status === UnitStatus.CANCELLED) {
        settleCancelled();
      } else {
        markFailed(unit, err);
        onUnitFailed?.(unit);
      }
    } finally {
      abortControllers.delete(unit.id);
      activeCount -= 1;
      onProgress?.();
      if (!disposed) drain();
    }
  }

  function cancelUnit(unitId) {
    const active = abortControllers.get(unitId);
    if (active) {
      active.controller.abort();
      markCancelled(active.unit);
      abortControllers.delete(unitId);
    }
    const idx = jobQueue.findIndex((j) => j.unit.id === unitId);
    if (idx !== -1) {
      const [removed] = jobQueue.splice(idx, 1);
      markCancelled(removed.unit);
    }
  }

  function cancelAll() {
    for (const [, active] of abortControllers) {
      active.controller.abort();
    }
    abortControllers.clear();
    for (const job of jobQueue) {
      markCancelled(job.unit);
    }
    jobQueue.length = 0;
  }

  function cancelStale(currentUnitId) {
    // Cancel jobs that are far from current position
    const toCancel = [];
    for (const job of jobQueue) {
      if (job.priority >= JobPriority.BACKGROUND && job.unit.id !== currentUnitId) {
        toCancel.push(job);
      }
    }
    for (const job of toCancel) {
      cancelUnit(job.unit.id);
      markCancelled(job.unit);
    }
  }

  function pause() {
    disposed = true;
    cancelAll();
  }

  function resume() {
    disposed = false;
    drain();
  }

  function stats() {
    return {
      active: activeCount,
      queued: jobQueue.length,
      maxConcurrency,
      total: activeCount + jobQueue.length,
    };
  }

  return {
    enqueue,
    cancelUnit,
    cancelAll,
    cancelStale,
    pause,
    resume,
    stats,
    get isIdle() { return activeCount === 0 && jobQueue.length === 0; },
    get isDisposed() { return disposed; },
  };
}
