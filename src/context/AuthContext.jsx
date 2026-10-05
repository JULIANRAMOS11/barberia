import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = cargando
  // Guardamos para qué usuario se cargó el perfil, así no hay "parpadeo" entre sesión y perfil
  const [state, setState] = useState({ userId: null, profile: null })

  useEffect(() => {
    api.getSession().then((s) => setSession(s ?? null))
    return api.onAuthChange((s) => setSession(s ?? null))
  }, [])

  const userId = session?.user?.id ?? null

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setState({ userId: null, profile: null })
      return null
    }
    let p = null
    try {
      p = await api.getProfile(userId)
    } catch {
      p = null
    }
    setState({ userId, profile: p })
    return p
  }, [userId])

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  const profile = state.userId === userId ? state.profile : null
  const loading = session === undefined || (userId !== null && state.userId !== userId)

  const value = {
    session,
    profile,
    loading,
    isAdmin: profile?.rol === 'admin',
    signIn: api.signIn,
    signUp: api.signUp,
    signOut: api.signOut,
    refreshProfile,
  }

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
