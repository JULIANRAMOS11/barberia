import { createClient } from '@supabase/supabase-js'

const DEFAULT_URL = 'https://eevpxkpplampediiggvc.supabase.co'
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldnB4a3BwbGFtcGVkaWlnZ3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNTgwNjYsImV4cCI6MjEwNjczNDA2Nn0.G3PuNOBBlpTkf4iF_gWfYD6njfYgyCmzlrSlbAZPJKg'

const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY

// Si hay credenciales (locales o en Vercel) corre conectado a Supabase
export const isDemo = !url || !anonKey

export const supabase = isDemo ? null : createClient(url, anonKey)
