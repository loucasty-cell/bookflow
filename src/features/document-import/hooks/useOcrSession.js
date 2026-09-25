import { useEffect, useRef, useState } from 'react';
import { API_BASE, ocrRequestErrorMessage } from '../../../components/ocrErrors.js';
import { MAX_FILE_SIZE } from '../index.js';
import { createOcrProgress, isPdfFile } from '../lib/ocrUploadUtils.js';
import { getOcrSkippedPages, normalizeOcrPages } from '../lib/ocrResultToBook.js';

const MAX_BACKEND_BYTES = MAX_FILE_SIZE;
const SCAN_TIMEOUT_MS = 10 * 60 * 1000;

function numberOr(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function mergeOcrProgress(previous = {}, data = {}, terminal = false) {
  const previousTotal = Math.max(0, numberOr(previous.totalPages));
  const incomingTotal = Math.max(0, numberOr(data.total_pages ?? data.totalPages));
  const totalPages = Math.max(previousTotal, incomingTotal);
  const incomingCurrent = Math.max(0, numberOr(data.current_page ?? data.currentPage));
  const boundedCurrent = totalPages > 0 ? Math.min(incomingCurrent, totalPages) : incomingCurrent;
  const currentPage = Math.max(0, numberOr(previous.currentPage), boundedCurrent);
  const incomingPercent = numberOr(
    data.percent,
    totalPages > 0 ? (currentPage / totalPages) * 100 : previous.percent
  );
  const previousPercent = Math.max(0, numberOr(previous.percent));
  const percent = terminal
    ? 100
    : Math.min(99, Math.max(1, previousPercent, Math.round(incomingPercent)));
  const incomingWords = numberOr(data.total_words ?? data.totalWords, 0);
  const previousWords = numberOr(previous.totalWords, 0);
  const incomingPps = numberOr(data.pages_per_second ?? data.pagesPerSecond, 0);
  const previousPps = numberOr(previous.pagesPerSecond, 0);
  const incomingElapsed = numberOr(data.elapsed_seconds ?? data.elapsedSeconds, 0);
  const previousElapsed = numberOr(previous.elapsedSeconds, 0);

  return {
    currentPage: terminal ? Math.max(currentPage, totalPages) : currentPage,
    totalPages,
    percent,
    totalWords: Math.max(0, previousWords, incomingWords),
    pagesPerSecond: Math.max(0, data.pages_per_second === undefined && data.pagesPerSecond === undefined ? previousPps : incomingPps),
    elapsedSeconds: Math.max(0, previousElapsed, incomingElapsed),
  };
}

function requestJobCancellation(jobId) {
  if (!jobId || typeof fetch !== 'function') return Promise.resolve();
  try {
    return Promise.resolve(fetch(`${API_BASE}/api/ocr/cancel/${jobId}`, { method: 'POST' })).catch(
      () => undefined
    );
  } catch {
    return Promise.resolve();
  }
}

function formatPageList(pages) {
  if (!pages.length) return '';
  if (pages.length <= 10) return pages.join(', ');
  return `${pages.slice(0, 10).join(', ')}…`;
}

function closeEventSourceInstance(source) {
  try {
    source?.close();
  } catch {
    return;
  }
}

export function useOcrSession({ onDocumentLoaded } = {}) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [ocrProfile, setOcrProfile] = useState('small');
  const [progress, setProgress] = useState(() => createOcrProgress());
  const [pages, setPages] = useState([]);
  const [skippedPages, setSkippedPages] = useState([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedType, setCopiedType] = useState(null);
  const [viewMode, setViewMode] = useState('formatted');
  const [jumpPageInput, setJumpPageInput] = useState('');
  const [jumpError, setJumpError] = useState('');

  const eventSourceRef = useRef(null);
  const fileInputRef = useRef(null);
  const uploadAbortRef = useRef(null);
  const jobIdRef = useRef(null);
  const pagesRef = useRef([]);
  const skippedPagesRef = useRef([]);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);
  const scanTimeoutRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      const timer = scanTimeoutRef.current;
      if (timer !== null) globalThis.clearTimeout(timer);
      scanTimeoutRef.current = null;
      const controller = uploadAbortRef.current;
      uploadAbortRef.current = null;
      controller?.abort();
      const source = eventSourceRef.current;
      eventSourceRef.current = null;
      closeEventSourceInstance(source);
      const activeJobId = jobIdRef.current;
      jobIdRef.current = null;
      void requestJobCancellation(activeJobId);
    };
  }, []);

  const isActive = (generation) => mountedRef.current && generationRef.current === generation;

  const clearTimeout = () => {
    if (scanTimeoutRef.current === null) return;
    globalThis.clearTimeout(scanTimeoutRef.current);
    scanTimeoutRef.current = null;
  };

  const closeEventSource = () => {
    const source = eventSourceRef.current;
    eventSourceRef.current = null;
    closeEventSourceInstance(source);
  };

  const stopActiveWork = (cancelRemote = true) => {
    const activeJobId = jobIdRef.current;
    jobIdRef.current = null;
    clearTimeout();
    const controller = uploadAbortRef.current;
    uploadAbortRef.current = null;
    controller?.abort();
    closeEventSource();
    return cancelRemote ? requestJobCancellation(activeJobId) : Promise.resolve();
  };

  const clearResultState = () => {
    pagesRef.current = [];
    skippedPagesRef.current = [];
    setPages([]);
    setSkippedPages([]);
    setActivePageIndex(0);
    setSearchQuery('');
    setCopiedType(null);
    setJumpPageInput('');
    setJumpError('');
  };

  const updatePageState = (incoming, { replace = false, reportedPages = [] } = {}) => {
    const incomingPages = Array.isArray(incoming) ? incoming : [];
    const sourcePages = replace ? incomingPages : [...pagesRef.current, ...incomingPages];
    const nextPages = normalizeOcrPages(sourcePages);
    const readableNumbers = new Set(nextPages.map((page) => page.page_number));
    const retainedSkippedPages = skippedPagesRef.current.filter((page) => !readableNumbers.has(page));
    const nextSkippedPages = [...new Set([
      ...retainedSkippedPages,
      ...getOcrSkippedPages(sourcePages, reportedPages),
    ])].sort((first, second) => first - second);
    pagesRef.current = nextPages;
    skippedPagesRef.current = nextSkippedPages;
    if (mountedRef.current) {
      setPages(nextPages);
      setSkippedPages(nextSkippedPages);
    }
    return { pages: nextPages, skippedPages: nextSkippedPages };
  };

  const commitProgress = (data, terminal = false) => {
    setProgress((previous) => mergeOcrProgress(previous, data, terminal));
  };

  const failScan = (generation, message, cancelRemote = Boolean(jobIdRef.current)) => {
    if (!isActive(generation)) return Promise.resolve();
    generationRef.current += 1;
    const cleanup = stopActiveWork(cancelRemote);
    if (!mountedRef.current) return cleanup;
    setJobId(null);
    setStatus('failed');
    setError(message);
    clearResultState();
    setProgress(createOcrProgress());
    return cleanup;
  };

  const completeScan = (generation, data) => {
    if (!isActive(generation)) return Promise.resolve();
    const hasFinalPages = Array.isArray(data.pages);
    const sourcePages = hasFinalPages ? data.pages : pagesRef.current;
    const finalResult = updatePageState(sourcePages, {
      replace: true,
      reportedPages: data.failed_pages ?? data.failedPages ?? [],
    });

    if (finalResult.pages.length === 0) {
      const detail = finalResult.skippedPages.length
        ? ` Skipped page${finalResult.skippedPages.length === 1 ? '' : 's'}: ${formatPageList(finalResult.skippedPages)}.`
        : '';
      return failScan(
        generation,
        `OCR scan finished without readable pages.${detail} Try a clearer copy or retry.`,
        false
      );
    }

    generationRef.current += 1;
    const cleanup = stopActiveWork(false);
    if (mountedRef.current) {
      setJobId(null);
      setStatus('completed');
      setError(null);
      commitProgress(data, true);
    }
    return cleanup;
  };

  const connectEventSource = (id, generation) => {
    if (!isActive(generation)) return;
    closeEventSource();

    let source;
    try {
      source = new EventSource(`${API_BASE}/api/ocr/progress/${id}`);
    } catch {
      void failScan(
        generation,
        'Cannot stream OCR progress. Check the backend and try again.',
        true
      );
      return;
    }
    eventSourceRef.current = source;

    const parseData = (event) => {
      try {
        const data = JSON.parse(event.data);
        return data && typeof data === 'object' ? data : null;
      } catch {
        return null;
      }
    };

    source.addEventListener('initial', (event) => {
      if (!isActive(generation)) return;
      const data = parseData(event);
      if (!data) return;
      if (data.status === 'completed') {
        void completeScan(generation, data);
        return;
      }
      if (data.status === 'failed' || data.status === 'canceled') {
        void failScan(generation, data.error || 'OCR processing did not complete.');
        return;
      }
      commitProgress(data);
      if (Array.isArray(data.pages) && data.pages.length > 0) {
        updatePageState(data.pages);
      }
    });

    source.addEventListener('progress', (event) => {
      if (!isActive(generation)) return;
      const data = parseData(event);
      if (!data) return;
      commitProgress(data);
      if (Array.isArray(data.pages) && data.pages.length > 0) {
        updatePageState(data.pages);
      } else if (data.latest_page) {
        updatePageState([data.latest_page]);
      }
    });

    source.addEventListener('completed', (event) => {
      if (!isActive(generation)) return;
      const data = parseData(event);
      if (!data) {
        void failScan(generation, 'OCR scan finished with an unreadable response.');
        return;
      }
      void completeScan(generation, data);
    });

    const handleError = (event) => {
      if (!isActive(generation)) return;
      let message = 'OCR progress stream disconnected. Check the backend and try again.';
      if (event?.data) {
        const data = parseData(event);
        if (data?.error) message = data.error;
      }
      void failScan(generation, message);
    };
    source.addEventListener('error', handleError);
    source.onerror = handleError;
  };

  const startScan = async () => {
    if (!file || !mountedRef.current) return;

    stopActiveWork(true);
    generationRef.current += 1;
    const generation = generationRef.current;
    const currentFile = file;

    setJobId(null);
    setStatus('uploading');
    setError(null);
    clearResultState();
    setProgress(createOcrProgress(1));

    scanTimeoutRef.current = globalThis.setTimeout(() => {
      void failScan(
        generation,
        'OCR scan timed out after 10 minutes. Try a smaller file or retry.',
        true
      );
    }, SCAN_TIMEOUT_MS);

    let controller = null;
    try {
      const formData = new FormData();
      formData.append('file', currentFile);
      formData.append('batch_size', '16');
      formData.append('ocr_profile', ocrProfile);

      controller = new AbortController();
      uploadAbortRef.current = controller;
      const response = await fetch(`${API_BASE}/api/ocr/scan`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      const newJobId = data.job_id;
      if (!newJobId) throw new Error('The scan service did not return a job. Try again.');
      if (!isActive(generation) || controller.signal.aborted) {
        void requestJobCancellation(newJobId);
        return;
      }
      jobIdRef.current = newJobId;
      setJobId(newJobId);
      commitProgress({ total_pages: data.total_pages });
      setStatus('processing');
      connectEventSource(newJobId, generation);
    } catch (err) {
      if (!isActive(generation) || controller?.signal.aborted) return;
      void failScan(generation, ocrRequestErrorMessage(err));
    } finally {
      if (controller && uploadAbortRef.current === controller) uploadAbortRef.current = null;
    }
  };

  const handleCancelScan = async () => {
    if (!mountedRef.current) return;
    generationRef.current += 1;
    const cleanup = stopActiveWork(true);
    setJobId(null);
    setStatus('idle');
    setError('Scan was canceled.');
    setIsDragging(false);
    clearResultState();
    setViewMode('formatted');
    setProgress(createOcrProgress());
    if (fileInputRef.current) fileInputRef.current.value = '';
    await cleanup;
  };

  const handleReset = () => {
    if (!mountedRef.current) return;
    generationRef.current += 1;
    stopActiveWork(true);
    setFile(null);
    setJobId(null);
    setStatus('idle');
    setProgress(createOcrProgress());
    setError(null);
    setIsDragging(false);
    clearResultState();
    setViewMode('formatted');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const acceptPdfFile = (candidate) => {
    if (!candidate) return;
    if (!isPdfFile(candidate)) {
      setError('Please upload a valid PDF document.');
      return;
    }
    if (candidate.size > MAX_BACKEND_BYTES) {
      setError('Please choose a PDF smaller than 50 MB.');
      return;
    }
    setFile(candidate);
    setError(null);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) acceptPdfFile(droppedFile);
  };

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) acceptPdfFile(selectedFile);
  };

  const loadDocument = (payload) => {
    if (!mountedRef.current) return;
    onDocumentLoaded?.(payload);
  };

  return {
    file,
    isDragging,
    jobId,
    status,
    error,
    ocrProfile,
    progress,
    pages,
    skippedPages,
    activePageIndex,
    setActivePageIndex,
    searchQuery,
    setSearchQuery,
    copiedType,
    setCopiedType,
    viewMode,
    setViewMode,
    jumpPageInput,
    setJumpPageInput,
    jumpError,
    setJumpError,
    fileInputRef,
    setOcrProfile,
    setError,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    startScan,
    handleCancelScan,
    handleReset,
    loadDocument,
  };
}
