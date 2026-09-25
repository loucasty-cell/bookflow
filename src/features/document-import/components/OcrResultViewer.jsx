import { useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Download,
  Eye,
  FileCode,
  RefreshCw,
  Search,
} from 'lucide-react';
import { baseName, buildOcrMarkdown } from '../lib/ocrUploadUtils.js';
import { getOcrSkippedPages, normalizeOcrPages } from '../lib/ocrResultToBook.js';

export function OcrResultViewer({
  status,
  progress,
  pages,
  skippedPages = [],
  file,
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
  onDocumentLoaded,
  onReset,
  setError,
}) {
  const copyTimerRef = useRef(null);
  const availablePages = useMemo(() => normalizeOcrPages(pages), [pages]);
  const skippedPageNumbers = useMemo(
    () => getOcrSkippedPages(pages, skippedPages),
    [pages, skippedPages]
  );

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        globalThis.clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (activePageIndex >= availablePages.length) {
      setActivePageIndex(availablePages.length ? availablePages.length - 1 : 0);
    }
  }, [availablePages.length, activePageIndex, setActivePageIndex]);

  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return availablePages;
    const query = searchQuery.toLowerCase();
    return availablePages.filter(
      (page) =>
        String(page.text ?? '').toLowerCase().includes(query) ||
        `page ${page.page_number}`.includes(query)
    );
  }, [availablePages, searchQuery]);

  const activePage = availablePages[activePageIndex] || availablePages[0] || null;
  const sourceTotalPages = Math.max(
    Number(progress?.totalPages) || 0,
    availablePages[availablePages.length - 1]?.page_number || 0,
    availablePages.length
  );
  const totalWords = Number(progress?.totalWords) || 0;
  const elapsedSeconds = Number(progress?.elapsedSeconds) || 0;
  const pagesPerSecond = Number(progress?.pagesPerSecond) || 0;

  const handleJumpPage = (event) => {
    event.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (Number.isNaN(pageNum) || pageNum < 1) {
      setJumpError('Enter a page number of 1 or higher.');
      return;
    }
    const targetIndex = availablePages.findIndex((page) => page.page_number === pageNum);
    if (targetIndex === -1) {
      setJumpError(`Page ${pageNum} is not available. Some pages may have failed to scan.`);
      return;
    }
    setJumpError('');
    setActivePageIndex(targetIndex);
    setJumpPageInput('');
  };

  const copyToClipboard = async (text, type) => {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      if (copyTimerRef.current !== null) globalThis.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = globalThis.setTimeout(() => {
        copyTimerRef.current = null;
        setCopiedType(null);
      }, 2000);
    } catch {
      setError('Copy is unavailable in this browser. Select the text manually to copy it.');
    }
  };

  const triggerDownload = (url, filename) => {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadMarkdown = () => {
    const fullMarkdown = buildOcrMarkdown(availablePages);
    const blob = new Blob([fullMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${baseName(file?.name, 'document')}_ocr.md`);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(availablePages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${baseName(file?.name, 'document')}_ocr_pages.json`);
  };

  const readDocument = () => {
    onDocumentLoaded?.({
      title: baseName(file?.name, 'OCR Document'),
      content: buildOcrMarkdown(availablePages),
      totalPages: availablePages.length,
      pages: availablePages,
      totalWords,
      skippedPages: skippedPageNumbers,
    });
  };

  if (status !== 'completed' && availablePages.length === 0) return null;

  return (
    <>
      {status === 'completed' && (
        <div className="ocr-success-banner" role="region" aria-label="OCR scan complete" aria-live="polite">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" aria-hidden="true" />
            <div>
              <h4 className="font-semibold text-emerald-100">Digitization Complete!</h4>
              <p className="text-sm text-emerald-300">
                Processed {sourceTotalPages} pages ({totalWords.toLocaleString()} words) in {elapsedSeconds}s ({pagesPerSecond} pages/sec).
              </p>
              {skippedPageNumbers.length > 0 && (
                <p className="text-sm text-amber-200">
                  Skipped {skippedPageNumbers.length} unreadable or empty page{skippedPageNumbers.length === 1 ? '' : 's'}: {skippedPageNumbers.join(', ')}.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {onDocumentLoaded && availablePages.length > 0 && (
              <button type="button" className="btn-primary" onClick={readDocument}>
                <BookOpen className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Read in Focus Mode
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={downloadMarkdown}>
              <Download className="w-4 h-4 mr-1.5" aria-hidden="true" />
              Export .md
            </button>
            <button type="button" className="btn-secondary" onClick={downloadJson}>
              <FileCode className="w-4 h-4 mr-1.5" aria-hidden="true" />
              JSON
            </button>
            <button type="button" className="btn-ghost" onClick={onReset} aria-label="Scan another book" title="Scan another book">
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {availablePages.length > 0 && (
        <div className="lazy-reader-container">
          <div className="reader-toolbar" role="toolbar" aria-label="OCR result controls">
            <div className="reader-nav-controls">
              <button
                type="button"
                className="btn-nav"
                onClick={() => setActivePageIndex(0)}
                disabled={activePageIndex === 0}
                title="First Page"
                aria-label="Go to first page"
              >
                <ChevronsLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn-nav"
                onClick={() => setActivePageIndex((previous) => Math.max(0, previous - 1))}
                disabled={activePageIndex === 0}
                title="Previous Page"
                aria-label="Go to previous page"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>

              <span className="page-indicator" aria-live="polite">
                Page <strong>{activePage ? activePage.page_number : 1}</strong> of {sourceTotalPages}
              </span>

              <button
                type="button"
                className="btn-nav"
                onClick={() => setActivePageIndex((previous) => Math.min(availablePages.length - 1, previous + 1))}
                disabled={activePageIndex >= availablePages.length - 1}
                title="Next Page"
                aria-label="Go to next page"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn-nav"
                onClick={() => setActivePageIndex(availablePages.length - 1)}
                disabled={activePageIndex >= availablePages.length - 1}
                title="Last Page"
                aria-label="Go to last page"
              >
                <ChevronsRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <form onSubmit={handleJumpPage} className="jump-form">
                <input
                  type="number"
                  min="1"
                  max={sourceTotalPages}
                  placeholder="Go to..."
                  value={jumpPageInput}
                  onChange={(event) => setJumpPageInput(event.target.value)}
                  className="jump-input"
                  aria-label="Jump to page number"
                />
              </form>
              {jumpError && (
                <span className="jump-error" role="status">{jumpError}</span>
              )}
            </div>

            <div className="reader-right-controls">
              <div className="search-bar-wrap">
                <Search className="w-4 h-4 search-icon" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search book..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="search-input"
                  aria-label="Search OCR results"
                />
              </div>

              <div className="view-toggle-group" role="group" aria-label="OCR result view">
                <button
                  type="button"
                  className={`toggle-btn ${viewMode === 'formatted' ? 'active' : ''}`}
                  onClick={() => setViewMode('formatted')}
                  title="Formatted Markdown View"
                  aria-label="Formatted Markdown View"
                  aria-pressed={viewMode === 'formatted'}
                >
                  <Eye className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${viewMode === 'raw' ? 'active' : ''}`}
                  onClick={() => setViewMode('raw')}
                  title="Raw Text / Markdown View"
                  aria-label="Raw Text or Markdown View"
                  aria-pressed={viewMode === 'raw'}
                >
                  <FileCode className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                className="btn-action"
                onClick={() => copyToClipboard(activePage ? activePage.text : '', 'page')}
                title="Copy current page"
                aria-label="Copy current page"
              >
                {copiedType === 'page' ? (
                  <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="w-4 h-4" aria-hidden="true" />
                )}
                <span>Copy Page</span>
              </button>
            </div>
          </div>

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
                      {activePage.text.split('\n\n').map((paragraph, paragraphIndex) => {
                        if (paragraph.startsWith('# ')) {
                          return <h1 key={paragraphIndex}>{paragraph.replace('# ', '')}</h1>;
                        }
                        if (paragraph.startsWith('## ')) {
                          return <h2 key={paragraphIndex}>{paragraph.replace('## ', '')}</h2>;
                        }
                        if (paragraph.startsWith('### ')) {
                          return <h3 key={paragraphIndex}>{paragraph.replace('### ', '')}</h3>;
                        }
                        if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                          return (
                            <ul key={paragraphIndex}>
                              {paragraph.split('\n').map((item, itemIndex) => (
                                <li key={itemIndex}>{item.replace(/^[-*]\s+/, '')}</li>
                              ))}
                            </ul>
                          );
                        }
                        return <p key={paragraphIndex}>{paragraph}</p>;
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
                <BookOpen className="w-8 h-8 text-zinc-600 mb-2" aria-hidden="true" />
                <p>No page content available</p>
              </div>
            )}
          </div>

          <div className="pages-thumbnail-strip">
            <span className="strip-title">Pages:</span>
            <div className="strip-scroll">
              {filteredPages.map((page) => {
                const isSelected = page.page_number === (activePage ? activePage.page_number : -1);
                return (
                  <button
                    type="button"
                    key={page.page_number}
                    className={`strip-page-btn ${isSelected ? 'is-active' : ''}`}
                    onClick={() => {
                      const realIndex = availablePages.findIndex(
                        (originalPage) => originalPage.page_number === page.page_number
                      );
                      if (realIndex !== -1) setActivePageIndex(realIndex);
                    }}
                    aria-label={`Open page ${page.page_number}`}
                    aria-pressed={isSelected}
                  >
                    {page.page_number}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default OcrResultViewer;
