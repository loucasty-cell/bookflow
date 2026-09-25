import { ReaderPage, ReaderShell } from "../features/reader/index.js";

export function AppReaderView({
  book,
  handleCloseBook,
  showIntervention,
  settings,
  setSettings,
  setShowIntervention,
  chapters,
  activeChapter,
  progress,
  readerState,
  activeParagraphIsLarge,
  overStaticRegion,
  staticRegionLabel,
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
  readerRef,
  jumpToChapter,
  focusParagraph,
  toggleBookmark,
  copyFocusedParagraph,
  moveFocus,
  addNote,
  resumeFlow,
  chapterWindow,
}) {
  const rewardChapterTitle = chapters[activeChapter]?.title ?? book?.title;

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <ReaderShell
        book={book}
        closeBook={handleCloseBook}
        showIntervention={showIntervention && settings.showInterventionModals === true}
        setShowIntervention={setShowIntervention}
        showRewardCapsules={settings.showRewardCapsules === true}
        rewardChapterTitle={rewardChapterTitle}
      >
        <ReaderPage
          book={book}
          settings={settings}
          setSettings={setSettings}
          chapters={chapters}
          activeChapter={activeChapter}
          progress={progress}
          readerState={readerState}
          activeParagraphIsLarge={activeParagraphIsLarge}
          overStaticRegion={overStaticRegion}
          staticRegionLabel={staticRegionLabel}
          notes={notes}
          setNotes={setNotes}
          bookmarks={bookmarks}
          bookmarkCount={bookmarks.length}
          noteDraft={noteDraft}
          setNoteDraft={setNoteDraft}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          notesOpen={notesOpen}
          setNotesOpen={setNotesOpen}
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
          focusId={focusId}
          focusedParagraph={focusedParagraph}
          pinnedId={pinnedId}
          isBookmarked={isBookmarked}
          minutes={minutes}
          totalWords={totalWords}
          readerRef={readerRef}
          closeBook={handleCloseBook}
          jumpToChapter={jumpToChapter}
          focusParagraph={focusParagraph}
          toggleBookmark={toggleBookmark}
          copyFocusedParagraph={copyFocusedParagraph}
          moveFocus={moveFocus}
          addNote={addNote}
          resumeFlow={resumeFlow}
          chapterWindow={chapterWindow}
        />
      </ReaderShell>
    </>
  );
}
