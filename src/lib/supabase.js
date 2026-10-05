import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Sin credenciales => la app corre en "modo demo" con datos locales (localStorage)
export const isDemo = !url || !anonKey

export const supabase = isDemo ? null : createClient(url, anonKey)
