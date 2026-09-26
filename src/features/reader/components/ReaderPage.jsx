import { useMemo, useRef, useState } from "react";
import { DEFAULT_SETTINGS } from "../config.js";
import { useReaderWindowEffects } from "../hooks/useReaderWindowEffects.js";
import { useScrollPosition } from "../lib/useScrollPosition.js";
import { useReaderSmoothScroll } from "../../scroll/index.js";
import { ContentsPanel } from "./ContentsPanel.jsx";
import { ReaderCanvas } from "./ReaderCanvas.jsx";
import { ReaderHeader } from "./ReaderHeader.jsx";
import { ReaderOverlays } from "./ReaderOverlays.jsx";

export function ReaderPage({
  book,
  bookId,
  settings,
  setSettings,
  chapters,
  activeChapter,
  notes,
  setNotes,
  bookmarks,
  noteDraft,
  setNoteDraft,
  sidebarOpen,
  setSidebarOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
  notesOpen,
  setNotesOpen,
  settingsOpen,
  setSettingsOpen,
  focusId,
  focusedParagraph,
  pinnedId,
  isBookmarked,
  minutes,
  totalWords,
  progress,
  readerState,
  activeParagraphIsLarge,
  overStaticRegion,
  staticRegionLabel,
  readerRef,
  closeBook,
  jumpToChapter,
  focusParagraph,
  toggleBookmark,
  copyFocusedParagraph,
  moveFocus,
  addNote,
  resumeFlow,
  chapterWindow = null,
}) {
  const safeSettings = {
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
  };
  const safeChapters = useMemo(() => (Array.isArray(chapters) ? chapters : []), [chapters]);
  const activeChapterText = useMemo(
    () =>
      (safeChapters[activeChapter]?.paragraphs || [])
        .map((paragraph) => String(paragraph?.text ?? ""))
        .filter(Boolean)
        .join("\n\n"),
    [activeChapter, safeChapters],
  );
  const totalParagraphs = Number(
    chapterWindow?.totalParagraphs ??
      safeChapters.reduce(
        (total, chapter) => total + (chapter?.paragraphs?.length ?? 0),
        0,
      ),
  );
  const safeTotalParagraphs = Number.isFinite(totalParagraphs) ? totalParagraphs : 0;
  const layoutKey = [
    safeSettings.fontSize,
    safeSettings.lineHeight,
    safeSettings.columnWidth,
    safeSettings.fontFamily,
    safeSettings.letterSpacing,
    safeSettings.bionic,
    safeSettings.focus,
    safeSettings.mode,
    safeSettings.theme,
    sidebarCollapsed,
    settingsOpen,
    notesOpen,
  ].join("|");
  const { isScrolling, direction: scrollDirection } = useScrollPosition(readerRef, {
    disabled: !book,
    measureParagraphs: false,
  });
  const [readerNode, setReaderNode] = useState(null);
  useReaderSmoothScroll(readerNode, Boolean(book));
  const isStaticFocusRegion = safeSettings.mode === "focus" && overStaticRegion;
  const safeProgress = Number.isFinite(progress)
    ? Math.min(100, Math.max(0, Math.round(progress)))
    : 0;
  const safeChapterLabel = safeChapters.length
    ? `${activeChapter + 1} / ${safeChapters.length}`
    : "–";
  const { windowed, winStart, winEnd, topSentinelRef, bottomSentinelRef } =
    useReaderWindowEffects({
      book,
      chapterCount: safeChapters.length,
      layoutKey,
      readerRef,
      chapterWindow,
    });
  const settingsButtonRef = useRef(null);
  const notesButtonRef = useRef(null);
  const navigatorButtonRef = useRef(null);
  const readerStatus = {
    focused: "In focus",
    transitioning: "Moving",
    snapping: "Aligning",
    skimming: "Skimming",
    paused: "Held",
    reading: "Reading",
  }[readerState] ?? "Reading";

  return (
    <div
      className="app-shell"
      data-theme={safeSettings.theme}
      data-reader-mode={safeSettings.mode}
      data-reader-state={readerState}
    >
      <ReaderHeader
        book={book}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        notesOpen={notesOpen}
        setNotesOpen={setNotesOpen}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        notes={notes}
        safeProgress={safeProgress}
        readerStatus={readerStatus}
        safeChapterLabel={safeChapterLabel}
        closeBook={closeBook}
        navigatorButtonRef={navigatorButtonRef}
        notesButtonRef={notesButtonRef}
        settingsButtonRef={settingsButtonRef}
      />

      <div
        className={`reader-layout ${sidebarCollapsed ? "is-sidebar-collapsed" : ""} ${settingsOpen || notesOpen ? "has-reader-panel" : ""} ${settingsOpen ? "has-settings-panel" : ""} ${notesOpen ? "has-notes-panel" : ""}`}
      >
        <ContentsPanel
          book={book}
          chapters={chapters}
          activeChapter={activeChapter}
          minutes={minutes}
          bookmarkCount={bookmarks.length}
          progress={progress}
          sidebarOpen={sidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarOpen={setSidebarOpen}
          setSidebarCollapsed={setSidebarCollapsed}
          jumpToChapter={jumpToChapter}
          closeBook={closeBook}
          returnFocusRef={navigatorButtonRef}
        />

        <ReaderCanvas
          readerRef={readerRef}
          onReaderNode={setReaderNode}
          safeSettings={safeSettings}
          isStaticFocusRegion={isStaticFocusRegion}
          activeParagraphIsLarge={activeParagraphIsLarge}
          isScrolling={isScrolling}
          scrollDirection={scrollDirection}
          safeTotalParagraphs={safeTotalParagraphs}
          focusId={focusId}
          book={book}
          chapters={chapters}
          activeChapter={activeChapter}
          minutes={minutes}
          totalWords={totalWords}
          progress={progress}
          windowed={windowed}
          winStart={winStart}
          winEnd={winEnd}
          chapterWindow={chapterWindow}
          topSentinelRef={topSentinelRef}
          bottomSentinelRef={bottomSentinelRef}
          bookmarks={bookmarks}
          pinnedId={pinnedId}
          focusParagraph={focusParagraph}
          jumpToChapter={jumpToChapter}
          closeBook={closeBook}
        />

        <ReaderOverlays
          bookTitle={book?.title}
          bookId={bookId}
           activeChapterTitle={safeChapters[activeChapter]?.title}
           chapterText={activeChapterText}
           progress={progress}
          isStaticFocusRegion={isStaticFocusRegion}
          staticRegionLabel={staticRegionLabel}
          focusedParagraph={focusedParagraph}
          pinnedId={pinnedId}
          isBookmarked={isBookmarked}
          toggleBookmark={toggleBookmark}
          copyFocusedParagraph={copyFocusedParagraph}
          moveFocus={moveFocus}
          resumeFlow={resumeFlow}
          settings={settings}
          setSettings={setSettings}
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
          settingsButtonRef={settingsButtonRef}
          notesOpen={notesOpen}
          setNotesOpen={setNotesOpen}
          notesButtonRef={notesButtonRef}
          notes={notes}
          setNotes={setNotes}
          noteDraft={noteDraft}
          setNoteDraft={setNoteDraft}
          addNote={addNote}
          readerRef={readerRef}
          focusId={focusId}
          lookupEnabled={safeSettings.showDefinitionLookup === true}
        />
      </div>
    </div>
  );
}
