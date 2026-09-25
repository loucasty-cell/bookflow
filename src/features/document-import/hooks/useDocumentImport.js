import { useCallback, useEffect, useRef } from 'react';
import { documentId, mark } from '../../../shared/lib/index.js';
import { parseDocument } from '../lib/documentParsers.js';
import { progressivePdfImport } from '../lib/importCoordinator.js';
import { manifestToBook } from '../lib/manifestToBook.js';
import { ocrResultToBook } from '../lib/ocrResultToBook.js';

const IMPORT_COMPLETE_DELAY = 480;

function createAbortError() {
  const error = new Error('Import canceled.');
  error.name = 'AbortError';
  return error;
}

function isAbortError(error) {
  return error?.name === 'AbortError' || /import (?:was )?canceled|import cancelled/i.test(
    String(error?.message ?? ''),
  );
}

function cancelWithoutThrow(action) {
  try {
    const result = action?.();
    if (result && typeof result.catch === 'function') result.catch(() => undefined);
  } catch {
    return;
  }
}

function getErrorMessage(error) {
  return error instanceof Error && error.message
    ? error.message
    : 'Bookflow could not open this document.';
}

function getActionableLocalError(error, isPdf) {
  let message = getErrorMessage(error);
  if (isPdf && /accelerated backend scan may still read it/i.test(message)) {
    message = 'Local PDF reading could not open this file.';
  }
  if (isPdf && !/password|locked|unsupported|too large|valid pdf/i.test(message)) {
    message += ' To try optional backend OCR, choose Optional accelerated OCR and press Start PP-OCRv6 scan; nothing is uploaded until you explicitly start it.';
  }
  return message;
}

function formatFailedUnits(failedUnits, totalUnits) {
  const pages = [...new Set(
    (failedUnits ?? [])
      .map((unit) => Number(unit?.sourcePage))
      .filter((page) => Number.isFinite(page)),
  )];
  if (!pages.length) {
    return `Local import could not finish all ${totalUnits || ''} sections.`.replace(/\s+/g, ' ').trim();
  }
  const pageList = pages.join(', ');
  return `Local import could not read page${pages.length === 1 ? '' : 's'} ${pageList}. Try a clearer copy or use the optional OCR action below.`;
}

export function useDocumentImport({
  fileInputRef,
  openBook,
  setBook,
  setLoading,
  setError,
  setOcrOpen,
  useProgressiveImport = true,
}) {
  const importHandleRef = useRef(null);
  const requestAbortRef = useRef(null);
  const completionTimerRef = useRef(null);
  const completionRejectRef = useRef(null);
  const requestGenerationRef = useRef(0);
  const lastProgressRef = useRef(0);
  const mountedRef = useRef(true);

  const isCurrentRequest = useCallback(
    (generation) => mountedRef.current && requestGenerationRef.current === generation,
    [],
  );

  const clearCompletionDelay = useCallback(() => {
    const timer = completionTimerRef.current;
    if (timer !== null) globalThis.clearTimeout(timer);
    completionTimerRef.current = null;
    const reject = completionRejectRef.current;
    completionRejectRef.current = null;
    reject?.();
  }, []);

  const stopActiveWork = useCallback(() => {
    clearCompletionDelay();
    const handle = importHandleRef.current;
    importHandleRef.current = null;
    if (handle) {
      cancelWithoutThrow(() => handle.cancel?.() ?? handle.dispose?.());
    }
    const controller = requestAbortRef.current;
    requestAbortRef.current = null;
    if (controller) controller.abort();
  }, [clearCompletionDelay]);

  const cancelActiveImport = useCallback(() => {
    requestGenerationRef.current += 1;
    stopActiveWork();
  }, [stopActiveWork]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelActiveImport();
    };
  }, [cancelActiveImport]);

  const reportLoading = useCallback(
    (generation, fileName, percent, label, detail, terminal = false) => {
      if (!isCurrentRequest(generation)) return;
      const numeric = Number.isFinite(Number(percent)) ? Number(percent) : lastProgressRef.current;
      const nextProgress = terminal
        ? 100
        : Math.max(lastProgressRef.current, Math.min(99, Math.round(numeric)));
      lastProgressRef.current = nextProgress;
      setLoading({
        name: fileName,
        percent: nextProgress,
        label,
        detail,
      });
    },
    [isCurrentRequest, setLoading],
  );

  const waitForImportCompletion = useCallback(
    (generation) => new Promise((resolve, reject) => {
      if (!isCurrentRequest(generation)) {
        reject(createAbortError());
        return;
      }
      const timer = globalThis.setTimeout(() => {
        completionTimerRef.current = null;
        completionRejectRef.current = null;
        if (isCurrentRequest(generation)) resolve();
        else reject(createAbortError());
      }, IMPORT_COMPLETE_DELAY);
      completionTimerRef.current = timer;
      completionRejectRef.current = () => {
        if (completionTimerRef.current !== null) {
          globalThis.clearTimeout(completionTimerRef.current);
          completionTimerRef.current = null;
        }
        completionRejectRef.current = null;
        reject(createAbortError());
      };
    }),
    [isCurrentRequest],
  );

  const openProgressivePdf = useCallback(
    async (file, generation, signal) => {
      const handle = await progressivePdfImport(
        file,
        ({ manifest, phase, unit, progress, failedUnits }) => {
          if (!isCurrentRequest(generation)) return;
          if (phase === 'manifest-ready') {
            reportLoading(
              generation,
              file.name,
              Math.max(8, progress ?? 0),
              `Found ${manifest.totalUnits} ${manifest.totalUnits === 1 ? 'page' : 'pages'}`,
              'Preparing every page locally before opening the reader.',
            );
            return;
          }
          if (phase === 'unit-ready' && unit) {
            const readyCount = manifest.units.filter((candidate) => candidate.status === 'READY').length;
            reportLoading(
              generation,
              file.name,
              Math.max(10, progress ?? 0),
              `Reading page ${unit.sourcePage} now`,
              `${readyCount} of ${manifest.totalUnits} pages ready. Your book stays on this device.`,
            );
            return;
          }
          if (phase === 'unit-failed' && unit) {
            reportLoading(
              generation,
              file.name,
              Math.max(10, progress ?? 0),
              `OCR failed on page ${unit.sourcePage}`,
              'The import will stop if this page cannot be recovered locally.',
            );
            return;
          }
          if (phase === 'complete' || phase === 'failed') {
            const terminal = phase === 'failed';
            reportLoading(
              generation,
              file.name,
              100,
              terminal ? 'Import needs attention' : 'Book ready',
              terminal
                ? formatFailedUnits(failedUnits, manifest.totalUnits)
                : 'All pages are ready in their original order.',
              true,
            );
          }
        },
        { signal },
      );

      if (!isCurrentRequest(generation) || signal.aborted) {
        cancelWithoutThrow(() => handle.cancel?.() ?? handle.dispose?.());
        throw createAbortError();
      }
      importHandleRef.current = handle;

      const completionPromise = typeof handle.waitForCompletion === 'function'
        ? handle.waitForCompletion()
        : handle.completion;
      const completion = (completionPromise
        ? await completionPromise
        : { status: 'complete', progress: handle.getProgress?.() ?? 100, failedUnits: [] }) ?? {};
      if (!isCurrentRequest(generation) || signal.aborted) throw createAbortError();
      if (completion.cancelled || completion.status === 'cancelled') throw createAbortError();
      const terminalProgress = Number(handle.getProgress?.() ?? completion.progress ?? 0);
      if (!Number.isFinite(terminalProgress) || terminalProgress < 100) {
        const error = new Error('Local import did not reach a complete terminal state.');
        error.importTerminal = true;
        throw error;
      }

      const reportedFailedUnits = Array.isArray(completion.failedUnits)
        ? completion.failedUnits
        : handle.getFailedUnits?.() ?? [];
      const failedUnits = reportedFailedUnits.length
        ? reportedFailedUnits
        : (handle.manifest?.units ?? []).filter((unit) => unit.status === 'FAILED' || unit.status === 'CANCELLED');
      if (failedUnits.length || completion.status === 'failed') {
        const error = new Error(formatFailedUnits(failedUnits, handle.manifest?.totalUnits));
        error.importTerminal = true;
        throw error;
      }

      const book = manifestToBook(handle.manifest);
      if (!book.chapters.length) {
        const error = new Error(
          'Local OCR could not find readable English text in this PDF. Try a clearer, upright scan or an OCR-ready copy.',
        );
        error.importTerminal = true;
        throw error;
      }
      reportLoading(
        generation,
        file.name,
        100,
        'Book ready',
        `${book.chapters.length} ${book.chapters.length === 1 ? 'section' : 'sections'} checked and ready to read.`,
        true,
      );
      await waitForImportCompletion(generation);
      if (!isCurrentRequest(generation)) throw createAbortError();
      setBook?.(book);
      mark('reader-mounted');
      openBook(book, documentId(file));
      cancelWithoutThrow(() => handle.dispose?.());
      if (importHandleRef.current === handle) importHandleRef.current = null;
    },
    [
      isCurrentRequest,
      openBook,
      reportLoading,
      setBook,
      waitForImportCompletion,
    ],
  );

  const openBlockingDocument = useCallback(
    async (file, generation) => {
      const parsed = await parseDocument(file, (percent, label) => {
        reportLoading(
          generation,
          file.name,
          Math.max(10, percent ?? 0),
          label,
          'Your book stays on this device while Bookflow prepares it.',
        );
      });
      if (!isCurrentRequest(generation)) throw createAbortError();
      if (!parsed.chapters?.length) {
        throw new Error('No readable text was found in this document.');
      }
      reportLoading(
        generation,
        file.name,
        100,
        'Book ready',
        parsed.ocrPageCount
          ? `${parsed.ocrPageCount} ${parsed.ocrPageCount === 1 ? 'scanned page' : 'scanned pages'} recovered privately and kept in the original page order.`
          : `${parsed.chapters.length} ${parsed.chapters.length === 1 ? 'section' : 'sections'} checked and ready to read.`,
        true,
      );
      await waitForImportCompletion(generation);
      if (!isCurrentRequest(generation)) throw createAbortError();
      setBook?.(parsed);
      mark('reader-mounted');
      openBook(parsed, documentId(file));
    },
    [isCurrentRequest, openBook, reportLoading, setBook, waitForImportCompletion],
  );

  const handleFile = useCallback(
    async (file) => {
      if (!file || !mountedRef.current) return;

      cancelActiveImport();
      const generation = requestGenerationRef.current;
      const controller = new AbortController();
      requestAbortRef.current = controller;
      lastProgressRef.current = 5;
      setError('');
      reportLoading(
        generation,
        file.name,
        5,
        'Checking your document',
        'Confirming the file type and readable book content locally.',
      );

      const isPdf = /\.pdf$/i.test(file.name || '');
      try {
        if (isPdf && useProgressiveImport !== false) {
          try {
            await openProgressivePdf(file, generation, controller.signal);
          } catch (progressiveError) {
            if (!isCurrentRequest(generation) || isAbortError(progressiveError)) return;
            if (progressiveError?.importTerminal) throw progressiveError;
            stopActiveWork();
            await openBlockingDocument(file, generation);
          }
        } else {
          await openBlockingDocument(file, generation);
        }
      } catch (caught) {
        if (!isCurrentRequest(generation) || isAbortError(caught)) return;
        stopActiveWork();
        setError(getActionableLocalError(caught, isPdf));
      } finally {
        if (isCurrentRequest(generation)) {
          setLoading(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          if (requestAbortRef.current === controller) requestAbortRef.current = null;
        }
      }
    },
    [
      cancelActiveImport,
      fileInputRef,
      isCurrentRequest,
      openBlockingDocument,
      openProgressivePdf,
      reportLoading,
      setError,
      setLoading,
      stopActiveWork,
      useProgressiveImport,
    ],
  );

  const handleOcrDocumentLoaded = useCallback(
    (ocrResult) => {
      const book = ocrResultToBook(ocrResult);
      if (!book) return;
      setOcrOpen(false);
      openBook(book, `ocr-${Date.now()}`);
    },
    [openBook, setOcrOpen],
  );

  const jumpToUnit = useCallback((index) => {
    cancelWithoutThrow(() => importHandleRef.current?.jumpToUnit(index));
  }, []);

  return {
    cancelActiveImport,
    handleFile,
    handleOcrDocumentLoaded,
    jumpToUnit,
  };
}
