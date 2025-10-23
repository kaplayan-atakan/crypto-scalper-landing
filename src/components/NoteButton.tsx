import { useState, useEffect } from 'react'
import { notesService } from '../services/notesService'
import type { RunNote } from '../types/supabase'
import './NoteButton.css'

interface NoteButtonProps {
  runId: string
  runLabel: string
}

export function NoteButton({ runId, runLabel }: NoteButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notes, setNotes] = useState<RunNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [noteCount, setNoteCount] = useState(0)

  // Load notes on mount
  useEffect(() => {
    loadNotes()
  }, [runId])

  const loadNotes = async () => {
    setIsLoading(true)
    const fetchedNotes = await notesService.getNotes(runId)
    setNotes(fetchedNotes)
    setNoteCount(fetchedNotes.length) // Use array length instead of separate query
    setIsLoading(false)
  }

  const handleOpen = () => {
    setIsOpen(true)
    loadNotes() // Refresh when opening
  }

  const handleClose = () => {
    setIsOpen(false)
    setNewNote('')
  }

  const handleAddNote = async () => {
    if (newNote.trim().length === 0) return

    setIsSaving(true)
    const success = await notesService.addNote(runId, newNote)
    
    if (success) {
      setNewNote('')
      await loadNotes() // Refresh notes and count
    } else {
      alert('Failed to save note. Please try again.')
    }
    
    setIsSaving(false)
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return

    const success = await notesService.deleteNote(noteId)
    
    if (success) {
      await loadNotes() // Refresh notes and count
    } else {
      alert('Failed to delete note. Please try again.')
    }
  }

  const handleTogglePin = async (noteId: string, currentPinStatus: boolean) => {
    const success = await notesService.togglePin(noteId, !currentPinStatus)
    
    if (success) {
      await loadNotes() // Refresh to show new pin order
      
      // Notify PinnedNoteDisplay components to refresh
      window.dispatchEvent(new CustomEvent('notesPinChanged', { 
        detail: { runId } 
      }))
    } else {
      alert('Failed to pin/unpin note. Please try again.')
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      <button
        className={`note-btn ${noteCount > 0 ? 'has-notes' : ''}`}
        onClick={handleOpen}
        disabled={isLoading}
        title={noteCount > 0 ? `${noteCount} note(s)` : 'Add notes'}
      >
        {isLoading ? '⏳' : noteCount > 0 ? `📝 ${noteCount}` : '📝'}
      </button>

      {isOpen && (
        <div className="note-modal-overlay" onClick={handleClose}>
          <div className="note-modal" onClick={(e) => e.stopPropagation()}>
            <div className="note-modal-header">
              <h3>📝 Notes for {runLabel}</h3>
              <button className="note-close-btn" onClick={handleClose}>✕</button>
            </div>

            <div className="note-modal-body">
              {/* Add Note Form */}
              <div className="add-note-section">
                <textarea
                  className="note-textarea"
                  placeholder="Type your note here..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={4}
                  disabled={isSaving}
                />
                <button
                  className="btn-primary"
                  onClick={handleAddNote}
                  disabled={isSaving || newNote.trim().length === 0}
                >
                  {isSaving ? '⏳ Adding...' : '➕ Add Note'}
                </button>
              </div>

              {/* Notes List */}
              <div className="notes-list">
                {isLoading ? (
                  <div className="notes-loading">⏳ Loading notes...</div>
                ) : notes.length === 0 ? (
                  <div className="notes-empty">No notes yet. Add your first note above!</div>
                ) : (
                  // Sort: Pinned notes first, then by created_at desc
                  [...notes]
                    .sort((a, b) => {
                      if (a.is_pinned === b.is_pinned) return 0
                      return a.is_pinned ? -1 : 1
                    })
                    .map((note) => (
                      <div key={note.id} className={`note-item ${note.is_pinned ? 'pinned' : ''}`}>
                        <div className="note-header">
                          <span className="note-date">{formatDate(note.created_at)}</span>
                          <div className="note-actions">
                            <button
                              className={`note-pin-btn ${note.is_pinned ? 'pinned' : ''}`}
                              onClick={() => handleTogglePin(note.id, note.is_pinned)}
                              title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                            >
                              📌
                            </button>
                            <button
                              className="note-delete-btn"
                              onClick={() => handleDeleteNote(note.id)}
                              title="Delete note"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <div className="note-content">{note.note}</div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
