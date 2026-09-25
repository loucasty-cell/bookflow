import { useMemo } from 'react';
import {
  AlertCircle,
  FileText,
  Loader2,
  UploadCloud,
  Zap,
} from 'lucide-react';
import { OcrResultViewer } from './OcrResultViewer.jsx';
import { useOcrSession } from '../hooks/useOcrSession.js';

export function OcrUploader({ onDocumentLoaded, onUseLocalOcr }) {
  const session = useOcrSession({ onDocumentLoaded });
  const {
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
  } = session;

  const predictedRemainingSeconds = useMemo(() => {
    if (status !== 'processing') return null;
    const current = Number(progress?.currentPage) || 0;
    const total = Number(progress?.totalPages) || 0;
    if (total <= 0 || current >= total) return 0;

    if (progress?.pagesPerSecond && Number(progress.pagesPerSecond) > 0) {
      const remainingPages = total - current;
      return Math.max(1, Math.ceil(remainingPages / Number(progress.pagesPerSecond)));
    }

    if (progress?.elapsedSeconds && Number(progress.elapsedSeconds) > 0 && current > 0) {
      const secPerPage = Number(progress.elapsedSeconds) / current;
      const remainingPages = total - current;
      return Math.max(1, Math.ceil(secPerPage * remainingPages));
    }

    return null;
  }, [status, progress]);

  const safePercent =
    typeof progress?.percent === 'number' && Number.isFinite(progress.percent)
      ? Math.min(100, Math.max(status === 'completed' ? 100 : 1, Math.round(progress.percent)))
      : status === 'completed'
        ? 100
        : status === 'processing' || status === 'uploading'
          ? 1
          : 0;

  return (
    <div className="ocr-uploader-container" aria-busy={status === 'uploading' || status === 'processing'}>
      <div className="ocr-header">
        <div className="ocr-title-badge">
          <Zap className="w-4 h-4 text-amber-500" aria-hidden="true" />
          <span>Self-hosted PP-OCRv6</span>
        </div>
        <h2 id="ocr-modal-title" className="ocr-title">Accelerated Book Digitizer</h2>
        <p className="ocr-subtitle">
          Uses the small detector and recognizer by default, with a medium quality mode for difficult scans. If the backend is unavailable, switch to private on-device English OCR.
        </p>
      </div>

      {(status === 'idle' || (status === 'uploading' && !jobId)) && (
        <>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,application/pdf"
            aria-label="PDF file to scan"
            className="hidden-file-input"
          />
          <button
            type="button"
            className={`ocr-dropzone ${isDragging ? 'is-dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (status === 'idle') fileInputRef.current?.click();
            }}
            disabled={status !== 'idle'}
            aria-disabled={status !== 'idle'}
            aria-label="Select a PDF to scan"
            aria-describedby={file ? undefined : 'ocr-dropzone-hint'}
          >
            <span className="dropzone-content">
              <span className="dropzone-icon-wrap">
                <UploadCloud className="w-8 h-8 text-indigo-500" aria-hidden="true" />
              </span>
              {file ? (
                <span className="selected-file-info">
                  <FileText className="w-5 h-5 text-indigo-400" aria-hidden="true" />
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                </span>
              ) : (
                <>
                  <span className="dropzone-prompt">
                    <strong>Click to select a PDF</strong> or drag & drop here
                  </span>
                  <span className="dropzone-hint" id="ocr-dropzone-hint">
                    Scanned PDF pages are sent only after you start this optional scan
                  </span>
                </>
              )}
            </span>
          </button>
        </>
      )}

      {status === 'idle' && (
        <div className="ocr-actions">
          {file && (
            <>
              <label className="ocr-profile-field">
                <span>OCR quality</span>
                <select value={ocrProfile} onChange={(event) => setOcrProfile(event.target.value)}>
                  <option value="small">Balanced and faster</option>
                  <option value="medium">Higher quality for difficult scans</option>
                </select>
              </label>
              <button type="button" className="btn-primary" onClick={startScan}>
                <Zap className="w-4 h-4 mr-2" aria-hidden="true" />
                Start PP-OCRv6 scan
              </button>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="ocr-error-banner" role="alert">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" aria-hidden="true" />
          <div className="error-text">
            <strong>Scan Error:</strong> {error}
          </div>
          {file && onUseLocalOcr && (
            <button type="button" className="btn-secondary" onClick={() => onUseLocalOcr(file)}>
              Use private on-device OCR
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={handleReset}>
            Try again
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={() => setError(null)}
            aria-label="Dismiss scan error"
          >
            &times;
          </button>
        </div>
      )}

      {(status === 'processing' || status === 'uploading') && (
        <div className="ocr-progress-card" role="region" aria-label="OCR scan progress">
          <div className="progress-header">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" aria-hidden="true" />
              <span className="font-medium text-zinc-100" aria-live="polite">
                {status === 'uploading'
                  ? 'Ingesting PDF in memory...'
                  : `Scanning Page ${progress.currentPage} of ${progress.totalPages || '...'}${predictedRemainingSeconds !== null ? ` (~${predictedRemainingSeconds}s remaining)` : ''}`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="progress-percent" aria-label={`${safePercent}% complete`}>
                {safePercent}%
              </span>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleCancelScan}
                aria-label="Cancel OCR scan"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  color: '#f87171',
                  border: '1px solid rgba(248, 113, 113, 0.3)',
                  borderRadius: '4px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>

          <div
            className="progress-bar-track"
            role="progressbar"
            aria-label="OCR scan progress"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={safePercent}
            aria-valuetext={`${safePercent}% complete`}
          >
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.max(1, safePercent)}%` }}
            />
          </div>

          <div className="progress-metrics-grid">
            <div className="metric-item">
              <span className="metric-label">Pages Completed</span>
              <span className="metric-value">{progress.currentPage} / {progress.totalPages || '—'}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Est. Remaining</span>
              <span className="metric-value">
                {predictedRemainingSeconds !== null ? `~${predictedRemainingSeconds}s` : status === 'uploading' ? 'Starting...' : 'Calculating...'}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Words Extracted</span>
              <span className="metric-value">{(progress?.totalWords || 0).toLocaleString()}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Speed</span>
              <span className="metric-value">{progress.pagesPerSecond || 0} pages/sec</span>
            </div>
          </div>
        </div>
      )}

      <OcrResultViewer
        status={status}
        progress={progress}
        pages={pages}
        skippedPages={skippedPages}
        file={file}
        activePageIndex={activePageIndex}
        setActivePageIndex={setActivePageIndex}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        copiedType={copiedType}
        setCopiedType={setCopiedType}
        viewMode={viewMode}
        setViewMode={setViewMode}
        jumpPageInput={jumpPageInput}
        setJumpPageInput={setJumpPageInput}
        jumpError={jumpError}
        setJumpError={setJumpError}
        onDocumentLoaded={onDocumentLoaded ? (loadDocument || onDocumentLoaded) : undefined}
        onReset={handleReset}
        setError={setError}
      />
    </div>
  );
}

export default OcrUploader;
