import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const supabaseUrl = "https://jrdiedgyizhrkmrcaqns.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZGllZGd5aXpocmttcmNhcW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMTAwMDgsImV4cCI6MjA3Mzg4NjAwOH0.1ka5rFreRcNDI-YnltGzVcVy8dR6DUo2p9N8YX5sEmQ"

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables - using dummy data mode')
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : null

export const isSupabaseConfigured = () => supabase !== null
