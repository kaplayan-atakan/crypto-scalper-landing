import { useState, useEffect } from 'react'
import { notesService } from '../services/notesService'
import './NoteButton.css'

interface NoteButtonProps {
  runId: string
  runLabel: string
}

export function NoteButton({ runId, runLabel }: NoteButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [note, setNote] = useState('')
  const [originalNote, setOriginalNote] = useState('')
  const [hasNote, setHasNote] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Load note on mount
  useEffect(() => {
    loadNote()
  }, [runId])

  const loadNote = async () => {
    setIsLoading(true)
    const fetchedNote = await notesService.getNote(runId)
    setNote(fetchedNote)
    setOriginalNote(fetchedNote)
    setHasNote(fetchedNote.trim().length > 0)
    setIsLoading(false)
  }

  const handleOpen = () => {
    setIsOpen(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    const trimmedNote = note.trim()
    
    if (trimmedNote.length === 0) {
      // Delete if empty
      if (hasNote) {
        const success = await notesService.deleteNote(runId)
        if (success) {
          setNote('')
          setOriginalNote('')
          setHasNote(false)
          setIsOpen(false)
        } else {
          alert('Failed to delete note. Please try again.')
        }
      } else {
        setIsOpen(false)
      }
    } else {
      // Save note
      const success = await notesService.saveNote(runId, trimmedNote)
      
      if (success) {
        setOriginalNote(trimmedNote)
        setHasNote(true)
        setIsOpen(false)
      } else {
        alert('Failed to save note. Please try again.')
      }
    }
    
    setIsSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this note?')) return
    
    setIsSaving(true)
    const success = await notesService.deleteNote(runId)
    
    if (success) {
      setNote('')
      setOriginalNote('')
      setHasNote(false)
      setIsOpen(false)
    } else {
      alert('Failed to delete note. Please try again.')
    }
    
    setIsSaving(false)
  }

  const handleCancel = () => {
    setNote(originalNote) // Restore original
    setIsOpen(false)
  }

  return (
    <>
      <button
        className={`note-btn ${hasNote ? 'has-note' : ''}`}
        onClick={handleOpen}
        title={hasNote ? 'Edit note' : 'Add note'}
        disabled={isLoading}
      >
        {isLoading ? '⏳' : hasNote ? '📝' : '📄'}
      </button>

      {isOpen && (
        <div className="note-modal-overlay" onClick={handleCancel}>
          <div className="note-modal" onClick={e => e.stopPropagation()}>
            <div className="note-modal-header">
              <h3>📝 Note for {runLabel}</h3>
              <button className="note-close-btn" onClick={handleCancel}>✕</button>
            </div>

            <textarea
              className="note-textarea"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add your notes here..."
              rows={8}
              autoFocus
              disabled={isSaving}
            />

            <div className="note-modal-footer">
              {hasNote && (
                <button 
                  className="note-btn-delete" 
                  onClick={handleDelete}
                  disabled={isSaving}
                >
                  🗑️ Delete
                </button>
              )}
              <button 
                className="note-btn-cancel" 
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button 
                className="note-btn-save" 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? '⏳ Saving...' : '💾 Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
