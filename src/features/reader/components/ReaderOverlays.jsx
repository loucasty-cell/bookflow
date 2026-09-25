import { useCallback, useState } from "react";
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
  chapterText = "",
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
  const { selection, anchorRect, clearSelection, selectText } = useReaderSelection({
    containerRef: readerRef,
    activeParagraphId: focusId,
    bookId,
  });
  const [lensOpenRequest, setLensOpenRequest] = useState(0);

  const addNoteFromSelection = useCallback(
    (text) => {
      setNoteDraft(text);
      setNotesOpen(true);
    },
    [setNoteDraft, setNotesOpen],
  );

  const openLensForSelection = useCallback(
    (text, paragraphId) => {
      selectText(text, paragraphId || selection.paragraphId);
      setLensOpenRequest((value) => value + 1);
    },
    [selectText, selection.paragraphId],
  );

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
             boundsRef={readerRef}
             chapterTitle={activeChapterTitle}
             chapterText={chapterText}
             onClearSelection={clearSelection}
             onAddNoteFromSelection={addNoteFromSelection}
            lensOpenRequest={lensOpenRequest}
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
        anchorRect={anchorRect}
        selectedText={selection.text}
        selectedParagraphId={selection.paragraphId}
        activeParagraphId={focusId}
        lookupEnabled={lookupEnabled}
        onAddNoteFromSelection={addNoteFromSelection}
        onBookmarkParagraph={toggleBookmark}
        onAskLens={openLensForSelection}
        onDismiss={clearSelection}
      />
    </>
  );
}
