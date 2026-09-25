import { ErrorBoundary } from "../../../shared/components/index.js";
import { FocusCard } from "./FocusCard.jsx";
import { NotesPanel } from "./NotesPanel.jsx";
import { SettingsPanel } from "./SettingsPanel.jsx";
import { SelectionTooltip } from "./SelectionTooltip.jsx";
import { useReaderSelection } from "../hooks/useReaderSelection.js";

export function ReaderOverlays({
  bookTitle,
  bookId,
  activeChapterTitle,
  progress,
  isStaticFocusRegion,
  staticRegionLabel,
  focusedParagraph,
  pinnedId,
  isBookmarked,
  toggleBookmark,
  copyFocusedParagraph,
  moveFocus,
  resumeFlow,
  settings,
  setSettings,
  settingsOpen,
  setSettingsOpen,
  settingsButtonRef,
  notesOpen,
  setNotesOpen,
  notesButtonRef,
  notes,
  setNotes,
  noteDraft,
  setNoteDraft,
  addNote,
  readerRef,
  focusId,
  lookupEnabled,
}) {
  const { selection, setSelection } = useReaderSelection({
    containerRef: readerRef,
    activeParagraphId: focusId,
    bookId,
  });

  return (
    <>
      {isStaticFocusRegion ? (
        <div className="static-region-label" role="status">
          {staticRegionLabel}
        </div>
      ) : (
        <ErrorBoundary>
          <FocusCard
            focusedParagraph={focusedParagraph}
            pinnedId={pinnedId}
            isBookmarked={isBookmarked}
            toggleBookmark={toggleBookmark}
            copyFocusedParagraph={copyFocusedParagraph}
            moveFocus={moveFocus}
            resumeFlow={resumeFlow}
            selectedText={selection.text}
          />
        </ErrorBoundary>
      )}
      <ErrorBoundary>
        <SettingsPanel
          settings={settings}
          setSettings={setSettings}
          open={settingsOpen}
          close={() => setSettingsOpen(false)}
          returnFocusRef={settingsButtonRef}
        />
      </ErrorBoundary>
      <ErrorBoundary>
        <NotesPanel
          open={notesOpen}
          close={() => setNotesOpen(false)}
          returnFocusRef={notesButtonRef}
          notes={notes}
          setNotes={setNotes}
          draft={noteDraft}
          setDraft={setNoteDraft}
          addNote={addNote}
          focusedParagraph={focusedParagraph}
          bookTitle={bookTitle}
          bookId={bookId}
          activeChapterTitle={activeChapterTitle}
          progress={progress}
        />
      </ErrorBoundary>
      <SelectionTooltip
        containerRef={readerRef}
        onAddNoteFromSelection={(text) => {
          setNoteDraft(text);
          setNotesOpen(true);
        }}
        onBookmarkParagraph={toggleBookmark}
        onAskLens={(text) => {
          setSelection((prev) => ({ ...prev, text }));
        }}
        activeParagraphId={focusId}
        lookupEnabled={lookupEnabled}
      />
    </>
  );
}

