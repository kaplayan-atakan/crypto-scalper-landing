import { useState, useEffect } from 'react'
import { notesService } from '../services/notesService'
import type { RunNote } from '../types/supabase'
import './PinnedNoteDisplay.css'

interface PinnedNoteDisplayProps {
  runId: string
}

export function PinnedNoteDisplay({ runId }: PinnedNoteDisplayProps) {
  const [pinnedNote, setPinnedNote] = useState<RunNote | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPinnedNote()
  }, [runId])

  const loadPinnedNote = async () => {
    setIsLoading(true)
    const note = await notesService.getPinnedNote(runId)
    setPinnedNote(note)
    setIsLoading(false)
  }

  if (isLoading || !pinnedNote) return null

  return (
    <div className="pinned-note-display">
      <div className="pinned-note-icon">📌</div>
      <div className="pinned-note-text">{pinnedNote.note}</div>
    </div>
  )
}
