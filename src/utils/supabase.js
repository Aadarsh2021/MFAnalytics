
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://aqlomkilvvsvdrfwcspm.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbG9ta2lsdnZzdmRyZndjc3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDYwNzUsImV4cCI6MjA4MTk4MjA3NX0.pxCKmd_48CyhH8XuoCWY95lKPLZFSrTkl076YK0iwBg'

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing! History will not be saved to cloud.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
