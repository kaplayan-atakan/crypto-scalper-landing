import type { RunNote } from '../types/supabase'
import './PinnedNoteDisplay.css'

interface PinnedNoteDisplayProps {
  pinnedNote: RunNote | null  // ✅ Receives data as prop, no fetch needed
}

export function PinnedNoteDisplay({ pinnedNote }: PinnedNoteDisplayProps) {
  if (!pinnedNote) return null

  return (
    <div className="pinned-note-display">
      <div className="pinned-note-icon">📌</div>
      <div className="pinned-note-text">{pinnedNote.note}</div>
    </div>
  )
}
