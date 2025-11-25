// Supabase Client
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ifvqkmpyknfezpxscnef.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdnFrbXB5a25mZXpweHNjbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzk5NjksImV4cCI6MjA3OTYxNTk2OX0._0c2EwgFodZOdBRj2ejlZBhdclMt_OOlAG0XprNNsFg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

