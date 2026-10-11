import { createClient } from '@supabase/supabase-js'

const DEFAULT_URL = 'https://eevpxkpplampediiggvc.supabase.co'
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldnB4a3BwbGFtcGVkaWlnZ3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNTgwNjYsImV4cCI6MjEwNjczNDA2Nn0.G3PuNOBBlpTkf4iF_gWfYD6njfYgyCmzlrSlbAZPJKg'

const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY

// Permitir alternar entre Supabase en vivo y Demo local (offline)
const forcedDemo = typeof window !== 'undefined' && localStorage.getItem('barberos_force_demo') === 'true'

// Si no hay credenciales o se forzó demo corre con demoApi local
export const isDemo = forcedDemo || !url || !anonKey

export const supabase = (!url || !anonKey) ? null : createClient(url, anonKey)
