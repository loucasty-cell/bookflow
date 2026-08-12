import { MessageSquareText, Plus, X } from "lucide-react";

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
      inert={open ? undefined : ""}
    >
      <div className="panel-heading">
        <span><MessageSquareText size={16} /> Margin notes</span>
        <button className="icon-button" onClick={close} aria-label="Close notes">
          <X size={18} />
        </button>
      </div>
      <div className="note-composer">
        {focusedParagraph && <blockquote>{focusedParagraph.text}</blockquote>}
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="What do you want to remember?"
          aria-label="New margin note"
        />
        <button onClick={addNote} disabled={!draft.trim()}>
          <Plus size={16} /> Add note
        </button>
      </div>
      <div className="notes-list">
        {!notes.length && (
          <div className="empty-notes">
            <MessageSquareText size={24} />
            <strong>Your margins are quiet</strong>
            <span>Focus a paragraph, then capture the thought it sparked.</span>
          </div>
        )}
        {notes.map((note) => (
          <article key={note.id}>
            {note.quote && <blockquote>{note.quote}</blockquote>}
            <p>{note.text}</p>
            <button
              onClick={() =>
                setNotes((current) => current.filter((item) => item.id !== note.id))
              }
              aria-label="Delete note"
            >
              <X size={14} />
            </button>
          </article>
        ))}
      </div>
    </aside>
  );
}
