import { supabase } from '../lib/supabase'

export interface RunNote {
  id: string
  run_id: string
  note: string
  created_at: string
  updated_at: string
}

class NotesService {
  // Fetch note for a specific run
  async getNote(runId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('run_notes')
        .select('note')
        .eq('run_id', runId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No note found - return empty
          return ''
        }
        throw error
      }

      return data?.note || ''
    } catch (err) {
      console.error('Error fetching note:', err)
      return ''
    }
  }

  // Save or update note
  async saveNote(runId: string, note: string): Promise<boolean> {
    try {
      // Upsert: insert or update if exists
      const { error } = await supabase
        .from('run_notes')
        .upsert(
          { run_id: runId, note },
          { onConflict: 'run_id' }
        )

      if (error) throw error
      return true
    } catch (err) {
      console.error('Error saving note:', err)
      return false
    }
  }

  // Delete note
  async deleteNote(runId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('run_notes')
        .delete()
        .eq('run_id', runId)

      if (error) throw error
      return true
    } catch (err) {
      console.error('Error deleting note:', err)
      return false
    }
  }
}

export const notesService = new NotesService()
