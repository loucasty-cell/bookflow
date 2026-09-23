import { MessageSquareText, Plus, X } from "lucide-react";
// TODO(backlog-11): add cross-chapter note search + jump-to-quote (Kindle My
// Notebook analogue). Notes already carry `quote`; resolve jumps by paragraph
// id first, quote match second, and show "Review location" on ambiguity.
// TODO(backlog-12): add annotation export/import via a versioned JSON bundle
// (documentId, title, progress, bookmarks, notes with quotes) in a future
// src/features/library/lib/annotationBundle.js, reusing the backend
// ExportPayload contract in backend/app/models/reader.py. Never persist text
// beyond the note quotes the user wrote.

export function NotesPanel({
  open,
  close,
  notes,
  setNotes,
  draft,
  setDraft,
  addNote,
  focusedParagraph,
}) {
  return (
    <aside
      className={`notes-drawer ${open ? "is-open" : ""}`}
      aria-hidden={!open}
      aria-label="Margin notes"
      inert={open ? undefined : true}
    >
      <div className="panel-heading">
        <span><MessageSquareText size={16} /> Margin notes</span>
        <button type="button" className="icon-button" onClick={close} aria-label="Close notes">
          <X size={18} />
        </button>
      </div>
      <div className="note-composer">
        {focusedParagraph && <blockquote>{focusedParagraph.text}</blockquote>}
        <textarea
          value={draft ?? ""}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="What do you want to remember?"
          aria-label="New margin note"
        />
        <button type="button" onClick={addNote} disabled={!(draft ?? "").trim()}>
          <Plus size={16} /> Add note
        </button>
      </div>
      <div className="notes-list">
        {!(notes ?? []).length && (
          <div className="empty-notes">
            <MessageSquareText size={24} />
            <strong>Your margins are quiet</strong>
            <span>Focus a paragraph, then capture the thought it sparked.</span>
          </div>
        )}
        {(notes ?? []).map((note) => (
          <article key={note.id} aria-label={`Note: ${String(note.text ?? "").slice(0, 80)}`}>
            {note.quote && <blockquote>{note.quote}</blockquote>}
            <p>{note.text}</p>
            <button
              type="button"
              onClick={() =>
                setNotes((current) => current.filter((item) => item.id !== note.id))
              }
              aria-label={`Delete note: ${String(note.text ?? "").slice(0, 80)}`}
            >
              <X size={14} />
            </button>
          </article>
        ))}
      </div>
    </aside>
  );
}
