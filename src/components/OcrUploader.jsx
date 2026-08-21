import { useState, useEffect, useRef, useMemo } from 'react';
import { ocrRequestErrorMessage, API_BASE } from './ocrErrors.js';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Check,
  Download,
  Search,
  Zap,
  BookOpen,
  RefreshCw,
  Eye,
  FileCode,
} from 'lucide-react';

export function OcrUploader({ onDocumentLoaded, onUseLocalOcr }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'uploading' | 'processing' | 'completed' | 'failed'
  const [error, setError] = useState(null);

  // Real-time progress metrics
  const [progress, setProgress] = useState({
    currentPage: 0,
    totalPages: 0,
    percent: 0,
    totalWords: 0,
    pagesPerSecond: 0,
    elapsedSeconds: 0,
  });

  // Page data store (all pages stored in memory, only active rendered)
  const [pages, setPages] = useState([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedType, setCopiedType] = useState(null);
  const [viewMode, setViewMode] = useState('formatted'); // 'formatted' | 'raw'
  const [jumpPageInput, setJumpPageInput] = useState('');

  const eventSourceRef = useRef(null);
  const fileInputRef = useRef(null);

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please upload a valid PDF document.');
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else if (selectedFile) {
      setError('Please select a PDF document.');
    }
  };

  const startScan = async () => {
    if (!file) return;

    setStatus('uploading');
    setError(null);
    setPages([]);
    setProgress({
      currentPage: 0,
      totalPages: 0,
      percent: 1,
      totalWords: 0,
      pagesPerSecond: 0,
      elapsedSeconds: 0,
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('batch_size', '16');

    try {
      const response = await fetch(`${API_BASE}/api/ocr/scan`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      const newJobId = data.job_id;
      setJobId(newJobId);
      setProgress((prev) => ({
        ...prev,
        totalPages: data.total_pages || 0,
      }));
      setStatus('processing');

      // Connect to Server-Sent Events (SSE) stream
      connectEventSource(newJobId);
    } catch (err) {
      setError(ocrRequestErrorMessage(err));
      setStatus('failed');
    }
  };

  const connectEventSource = (id) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sseUrl = `${API_BASE}/api/ocr/progress/${id}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener('initial', (e) => {
      try {
        const data = JSON.parse(e.data);
        setProgress((prev) => ({
          ...prev,
          totalPages: data.total_pages,
          currentPage: data.current_page,
          percent: data.percent,
          totalWords: data.total_words,
        }));
        if (data.pages && data.pages.length > 0) {
          setPages(data.pages);
        }
      } catch (err) {
        console.error('SSE initial parse error:', err);
      }
    });

    es.addEventListener('progress', (e) => {
      try {
        const data = JSON.parse(e.data);
        setProgress({
          currentPage: data.current_page,
          totalPages: data.total_pages,
          percent: data.percent,
          totalWords: data.total_words,
          pagesPerSecond: data.pages_per_second,
          elapsedSeconds: data.elapsed_seconds,
        });

        if (data.latest_page) {
          setPages((prevPages) => {
            const exists = prevPages.some((p) => p.page_number === data.latest_page.page_number);
            if (!exists) {
              const updated = [...prevPages, data.latest_page];
              updated.sort((a, b) => a.page_number - b.page_number);
              return updated;
            }
            return prevPages;
          });
        }
      } catch (err) {
        console.error('SSE progress parse error:', err);
      }
    });

    es.addEventListener('completed', (e) => {
      try {
        const data = JSON.parse(e.data);
        setProgress({
          currentPage: data.total_pages,
          totalPages: data.total_pages,
          percent: 100,
          totalWords: data.total_words,
          pagesPerSecond: data.pages_per_second,
          elapsedSeconds: data.elapsed_seconds,
        });
        if (data.pages) {
          setPages(data.pages);
        }
        setStatus('completed');
        es.close();

        if (onDocumentLoaded && data.markdown) {
          onDocumentLoaded({
            title: file ? file.name.replace('.pdf', '') : 'OCR Document',
            content: data.markdown,
            totalPages: data.total_pages,
            pages: data.pages,
          });
        }
      } catch (err) {
        console.error('SSE completed parse error:', err);
      }
    });

    es.addEventListener('error', (e) => {
      if (e.data) {
        try {
          const data = JSON.parse(e.data);
          setError(data.error || 'OCR processing encountered an error.');
        } catch {
          // ignore parsing error
        }
      }
      setStatus('failed');
      es.close();
    });

    es.onerror = () => {
      // EventSource network dropout handler
      if (status === 'processing') {
        // es will auto-reconnect or fail gracefully
      }
    };
  };

  const handleCancelScan = async () => {
    if (jobId) {
      try {
        await fetch(`${API_BASE}/api/ocr/cancel/${jobId}`, { method: 'POST' });
      } catch {
        // network cleanup
      }
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setStatus('idle');
    setError('Scan was canceled.');
  };

  const handleReset = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setFile(null);
    setJobId(null);
    setStatus('idle');
    setPages([]);
    setProgress({
      currentPage: 0,
      totalPages: 0,
      percent: 0,
      totalWords: 0,
      pagesPerSecond: 0,
      elapsedSeconds: 0,
    });
    setError(null);
    setActivePageIndex(0);
    setSearchQuery('');
  };

  // Filtered pages for search
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return pages;
    const query = searchQuery.toLowerCase();
    return pages.filter(
      (p) =>
        p.text.toLowerCase().includes(query) ||
        `page ${p.page_number}`.includes(query)
    );
  }, [pages, searchQuery]);

  // Predicted remaining time estimation
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

  const safePercent = typeof progress?.percent === 'number' && !isNaN(progress.percent)
    ? Math.min(100, Math.max(status === 'completed' ? 100 : 1, Math.round(progress.percent)))
    : (status === 'completed' ? 100 : (status === 'processing' || status === 'uploading' ? 1 : 0));

  // Active page selection
  const activePage = pages[activePageIndex] || pages[0] || null;

  const handleJumpPage = (e) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pages.length) {
      const targetIndex = pages.findIndex((p) => p.page_number === pageNum);
      if (targetIndex !== -1) {
        setActivePageIndex(targetIndex);
        setJumpPageInput('');
      }
    }
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadMarkdown = () => {
    const fullMarkdown = pages
      .map((p) => `<!-- Page ${p.page_number} -->\n\n${p.text}`)
      .join('\n\n---\n\n');
    const blob = new Blob([fullMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file ? file.name.replace('.pdf', '') : 'document'}_ocr.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(pages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file ? file.name.replace('.pdf', '') : 'document'}_ocr_pages.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ocr-uploader-container">
      {/* Header */}
      <div className="ocr-header">
        <div className="ocr-title-badge">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Optional PaddleOCR + Hugging Face OCR</span>
        </div>
        <h2 className="ocr-title">Accelerated Book Digitizer</h2>
        <p className="ocr-subtitle">
          Uses PaddleOCR on your backend first, then the configured Hugging Face vision model. If both are unavailable, switch to private on-device English OCR.
        </p>
      </div>

      {/* Upload Dropzone (when idle or uploading) */}
      {(status === 'idle' || (status === 'uploading' && !jobId)) && (
        <div
          className={`ocr-dropzone ${isDragging ? 'is-dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,application/pdf"
            className="hidden-file-input"
          />
          <div className="dropzone-content">
            <div className="dropzone-icon-wrap">
              <UploadCloud className="w-8 h-8 text-indigo-500" />
            </div>
            {file ? (
              <div className="selected-file-info">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span className="file-name">{file.name}</span>
                <span className="file-size">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
              </div>
            ) : (
              <>
                <p className="dropzone-prompt">
                  <strong>Click to select a PDF</strong> or drag & drop here
                </p>
                <span className="dropzone-hint">Scanned PDF pages are sent only after you start this optional scan</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Start Button */}
      {status === 'idle' && (
        <div className="ocr-actions">
          {file && (
            <button className="btn-primary" onClick={startScan}>
              <Zap className="w-4 h-4 mr-2" />
              Try configured OCR endpoint
            </button>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="ocr-error-banner">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <div className="error-text">
            <strong>Scan Error:</strong> {error}
          </div>
          {file && onUseLocalOcr && (
            <button className="btn-secondary" onClick={() => onUseLocalOcr(file)}>
              Use private on-device OCR
            </button>
          )}
          <button className="btn-secondary" onClick={handleReset}>
            Try again
          </button>
          <button className="btn-icon" onClick={() => setError(null)}>
            &times;
          </button>
        </div>
      )}

      {/* Live SSE Progress Panel */}
      {(status === 'processing' || status === 'uploading') && (
        <div className="ocr-progress-card">
          <div className="progress-header">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              <span className="font-medium text-zinc-100">
                {status === 'uploading'
                  ? 'Ingesting PDF in memory...'
                  : `Scanning Page ${progress.currentPage} of ${progress.totalPages || '...'}${predictedRemainingSeconds !== null ? ` (~${predictedRemainingSeconds}s remaining)` : ''}`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="progress-percent">{safePercent}%</span>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleCancelScan}
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

          {/* Progress bar track */}
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.max(1, safePercent)}%` }}
            />
          </div>

          {/* Real-time stats */}
          <div className="progress-metrics-grid">
            <div className="metric-item">
              <span className="metric-label">Pages Completed</span>
              <span className="metric-value">{progress.currentPage} / {progress.totalPages || '—'}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Est. Remaining</span>
              <span className="metric-value">
                {predictedRemainingSeconds !== null ? `~${predictedRemainingSeconds}s` : (status === 'uploading' ? 'Starting...' : 'Calculating...')}
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

      {/* Completion Banner */}
      {status === 'completed' && (
        <div className="ocr-success-banner">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div>
              <h4 className="font-semibold text-emerald-100">Digitization Complete!</h4>
              <p className="text-sm text-emerald-300">
                Processed {progress.totalPages} pages ({progress.totalWords.toLocaleString()} words) in {progress.elapsedSeconds}s ({progress.pagesPerSecond} pages/sec).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {onDocumentLoaded && (
              <button
                className="btn-primary"
                onClick={() => {
                  const fullMarkdown = pages.map((p) => `<!-- Page ${p.page_number} -->\n\n${p.text}`).join('\n\n---\n\n');
                  onDocumentLoaded({
                    title: file ? file.name.replace('.pdf', '') : 'OCR Document',
                    content: fullMarkdown,
                    totalPages: pages.length,
                    pages: pages,
                  });
                }}
              >
                <BookOpen className="w-4 h-4 mr-1.5" />
                Read in Focus Mode
              </button>
            )}
            <button className="btn-secondary" onClick={downloadMarkdown}>
              <Download className="w-4 h-4 mr-1.5" />
              Export .md
            </button>
            <button className="btn-secondary" onClick={downloadJson}>
              <FileCode className="w-4 h-4 mr-1.5" />
              JSON
            </button>
            <button className="btn-ghost" onClick={handleReset} title="Scan another book">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Lazy Reader View: Only active pages rendered in DOM */}
      {pages.length > 0 && (
        <div className="lazy-reader-container">
          {/* Reader Toolbar */}
          <div className="reader-toolbar">
            <div className="reader-nav-controls">
              <button
                className="btn-nav"
                onClick={() => setActivePageIndex(0)}
                disabled={activePageIndex === 0}
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                className="btn-nav"
                onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                disabled={activePageIndex === 0}
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="page-indicator">
                Page <strong>{activePage ? activePage.page_number : 1}</strong> of {pages.length}
              </span>

              <button
                className="btn-nav"
                onClick={() => setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                disabled={activePageIndex >= pages.length - 1}
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                className="btn-nav"
                onClick={() => setActivePageIndex(pages.length - 1)}
                disabled={activePageIndex >= pages.length - 1}
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>

              {/* Jump to page form */}
              <form onSubmit={handleJumpPage} className="jump-form">
                <input
                  type="number"
                  min="1"
                  max={pages.length}
                  placeholder="Go to..."
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  className="jump-input"
                />
              </form>
            </div>

            {/* Search and view toggle */}
            <div className="reader-right-controls">
              <div className="search-bar-wrap">
                <Search className="w-4 h-4 search-icon" />
                <input
                  type="text"
                  placeholder="Search book..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="view-toggle-group">
                <button
                  className={`toggle-btn ${viewMode === 'formatted' ? 'active' : ''}`}
                  onClick={() => setViewMode('formatted')}
                  title="Formatted Markdown View"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  className={`toggle-btn ${viewMode === 'raw' ? 'active' : ''}`}
                  onClick={() => setViewMode('raw')}
                  title="Raw Text / Markdown View"
                >
                  <FileCode className="w-4 h-4" />
                </button>
              </div>

              <button
                className="btn-action"
                onClick={() => copyToClipboard(activePage ? activePage.text : '', 'page')}
                title="Copy current page"
              >
                {copiedType === 'page' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>Copy Page</span>
              </button>
            </div>
          </div>

          {/* Lazy Single-Page Render Window */}
          <div className="active-page-viewport">
            {activePage ? (
              <div className="page-content-card">
                <div className="page-card-header">
                  <span className="badge-page">Page {activePage.page_number}</span>
                  <div className="page-meta-tags">
                    <span className="meta-tag">{activePage.word_count || 0} words</span>
                    {activePage.latency_ms > 0 && (
                      <span className="meta-tag">{activePage.latency_ms} ms</span>
                    )}
                  </div>
                </div>

                <div className="page-card-body">
                  {viewMode === 'formatted' ? (
                    <div className="formatted-prose">
                      {activePage.text.split('\n\n').map((para, pIdx) => {
                        if (para.startsWith('# ')) {
                          return <h1 key={pIdx}>{para.replace('# ', '')}</h1>;
                        }
                        if (para.startsWith('## ')) {
                          return <h2 key={pIdx}>{para.replace('## ', '')}</h2>;
                        }
                        if (para.startsWith('### ')) {
                          return <h3 key={pIdx}>{para.replace('### ', '')}</h3>;
                        }
                        if (para.startsWith('- ') || para.startsWith('* ')) {
                          return (
                            <ul key={pIdx}>
                              {para.split('\n').map((li, liIdx) => (
                                <li key={liIdx}>{li.replace(/^[-*]\s+/, '')}</li>
                              ))}
                            </ul>
                          );
                        }
                        return <p key={pIdx}>{para}</p>;
                      })}
                    </div>
                  ) : (
                    <pre className="raw-markdown-view">
                      <code>{activePage.text}</code>
                    </pre>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-page-state">
                <BookOpen className="w-8 h-8 text-zinc-600 mb-2" />
                <p>No page content available</p>
              </div>
            )}
          </div>

          {/* Quick Page Jump Thumbnails Strip (Windowed / virtualized index list) */}
          <div className="pages-thumbnail-strip">
            <span className="strip-title">Pages:</span>
            <div className="strip-scroll">
              {filteredPages.map((p) => {
                const isSelected = p.page_number === (activePage ? activePage.page_number : -1);
                return (
                  <button
                    key={p.page_number}
                    className={`strip-page-btn ${isSelected ? 'is-active' : ''}`}
                    onClick={() => {
                      const realIndex = pages.findIndex((orig) => orig.page_number === p.page_number);
                      if (realIndex !== -1) setActivePageIndex(realIndex);
                    }}
                  >
                    {p.page_number}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OcrUploader;
