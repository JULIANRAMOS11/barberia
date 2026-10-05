import { isDemo } from '../supabase'
import { demoApi } from './demoApi'
import { supabaseApi } from './supabaseApi'

// Punto único de acceso a datos: la UI nunca sabe si habla con Supabase o con la demo
export const api = isDemo ? demoApi : supabaseApi
export { isDemo }
