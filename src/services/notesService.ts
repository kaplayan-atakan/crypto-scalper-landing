import { supabase } from '../lib/supabase'
import type { RunNote } from '../types/supabase'

class NotesService {
  // Fetch all notes for a specific run (ordered by newest first)
  async getNotes(runId: string): Promise<RunNote[]> {
    try {
      if (!supabase) return []
      
      const { data, error } = await supabase
        .from('run_notes')
        .select('*')
        .eq('run_id', runId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Error fetching notes:', err)
      return []
    }
  }

  // Add a new note
  async addNote(runId: string, note: string): Promise<boolean> {
    try {
      if (!supabase) return false
      
      const trimmedNote = note.trim()
      if (trimmedNote.length === 0) {
        return false
      }

      const { error } = await supabase
        .from('run_notes')
        .insert({ run_id: runId, note: trimmedNote } as any)

      if (error) throw error
      return true
    } catch (err) {
      console.error('Error adding note:', err)
      return false
    }
  }

  // Delete a specific note by id
  async deleteNote(noteId: string): Promise<boolean> {
    try {
      if (!supabase) return false
      
      const { error } = await supabase
        .from('run_notes')
        .delete()
        .eq('id', noteId)

      if (error) throw error
      return true
    } catch (err) {
      console.error('Error deleting note:', err)
      return false
    }
  }

  // Toggle pin status of a note
  async togglePin(noteId: string, isPinned: boolean): Promise<boolean> {
    try {
      if (!supabase) return false
      
      const { error } = await supabase
        .from('run_notes')
        .update({ is_pinned: isPinned } as any)
        .eq('id', noteId)

      if (error) throw error
      return true
    } catch (err) {
      console.error('Error toggling pin:', err)
      return false
    }
  }

  // Get pinned note for a run (for display in overall box)
  async getPinnedNote(runId: string): Promise<RunNote | null> {
    try {
      if (!supabase) return null
      
      const { data, error } = await supabase
        .from('run_notes')
        .select('*')
        .eq('run_id', runId)
        .eq('is_pinned', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // No pinned note
        throw error
      }
      
      return data
    } catch (err) {
      console.error('Error fetching pinned note:', err)
      return null
    }
  }
}

export const notesService = new NotesService()
