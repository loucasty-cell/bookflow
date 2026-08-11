import { Bookmark, BookmarkCheck, Check, Copy, Focus } from 'lucide-react'

export function FocusCard({ focusedSentence, pinnedId, isBookmarked, toggleBookmark, copyFocusedSentence, resumeFlow }) {
  if (!focusedSentence) return null

  return (
    <div className="focus-card" aria-live="polite">
      <div className="focus-card-label"><Focus size={14} /> {pinnedId ? 'Focus held' : 'In focus'}</div>
      <p>{focusedSentence.text}</p>
      <div>
        <button onClick={toggleBookmark}>
          {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          {isBookmarked ? 'Saved' : 'Save'}
        </button>
        <button onClick={copyFocusedSentence}><Copy size={16} /> Copy</button>
        {pinnedId && <button onClick={resumeFlow}><Check size={16} /> Resume flow</button>}
      </div>
    </div>
  )
}
