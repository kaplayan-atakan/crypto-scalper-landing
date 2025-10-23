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

  // Get note count for a run (for badge display)
  async getNoteCount(runId: string): Promise<number> {
    try {
      if (!supabase) return 0
      
      const { count, error } = await supabase
        .from('run_notes')
        .select('*', { count: 'exact', head: true })
        .eq('run_id', runId)

      if (error) throw error
      return count || 0
    } catch (err) {
      console.error('Error fetching note count:', err)
      return 0
    }
  }
}

export const notesService = new NotesService()
