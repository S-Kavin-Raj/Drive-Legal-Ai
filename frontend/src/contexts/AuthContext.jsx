import React, { createContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import * as authService from '../services/authService'
import { getCachedRole, setCachedRole, clearCachedRole } from '../hooks/useRoleCache'
import { apiClient } from '../services/apiClient'
import { clearSession, getStoredRole, getStoredUser, isSessionExpired, normalizeSessionUser, readSession, writeSession } from '../services/sessionStore'

export const AuthContext = createContext(null)

// Note: useAuth() hook has been moved to src/hooks/useAuth.js
// to comply with Vite Fast Refresh (each file must export only one kind of export).

export function AuthProvider({ children }) {
  const storedUser = getStoredUser()
  const storedRole = getStoredRole()
  const storedSession = readSession()

  const [user, setUser] = useState(storedUser)
  const [role, setRole] = useState(storedRole)
  const [token, setToken] = useState(storedSession?.token || null)
  const [loading, setLoading] = useState(!storedSession || isSessionExpired(storedSession))
  const [sessionError, setSessionError] = useState(null)

  async function refreshRole(uid) {
    if (!uid) return null
    try {
      const doc = await authService.fetchUserRole(uid)
      const r = (doc && doc.role) || 'user'
      setRole(r)
      setCachedRole(uid, r)
      return r
    } catch (err) {
      console.error('refreshRole failed', err)
      setRole((prev) => prev || 'user')
      return role
    }
  }

  useEffect(() => {
    let mounted = true

    if (storedSession && isSessionExpired(storedSession)) {
      clearSession()
      setUser(null)
      setRole(null)
      setToken(null)
      setLoading(true)
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mounted) return
      setLoading(true)
      if (!firebaseUser) {
        const persistedSession = readSession()
        if (persistedSession && !isSessionExpired(persistedSession)) {
          setUser(normalizeSessionUser(persistedSession.user))
          setRole(persistedSession.user?.role || null)
          setToken(persistedSession.token || null)
          setLoading(false)
          return
        }

        setUser(null)
        setRole(null)
        setToken(null)
        setSessionError(null)
        setLoading(false)
        return
      }

      const minimal = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || null,
        email: firebaseUser.email || null,
      }
      setUser(minimal)

      const cached = getCachedRole(firebaseUser.uid)
      if (cached) {
        setRole(cached)
      }

      try {
        const firebaseToken = await firebaseUser.getIdToken()
        const doc = await authService.fetchUserRole(firebaseUser.uid)
        const r = (doc && doc.role) || 'user'
        setRole(r)
        setCachedRole(firebaseUser.uid, r)
        const response = await apiClient.post(
          '/api/auth/session',
          {
            firebaseToken,
            user: {
              userId: firebaseUser.uid,
              email: firebaseUser.email || null,
              name: firebaseUser.displayName || null,
              role: r,
            },
          },
          { skipAuth: true }
        )

        const session = response.data
        writeSession(session)
        setToken(session.token)
        setUser(normalizeSessionUser(session.user))
        setRole(session.user?.role || r)
        setSessionError(null)
      } catch (err) {
        console.error('AuthProvider role fetch error', err)
        setSessionError(err)
      } finally {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      unsub()
    }
  }, [])

  useEffect(() => {
    const handleAuthFailure = async () => {
      if (user?.uid) {
        clearCachedRole(user.uid)
      }
      clearSession()
      setUser(null)
      setRole(null)
      setToken(null)
      setSessionError(null)
      try {
        await authService.logout()
      } catch {
        // ignore logout failures during forced session cleanup
      }
      window.location.assign('/login')
    }

    const handleNetworkError = (e) => {
      console.error('Network error detected by apiClient:', e?.detail || e)
      setSessionError(new Error('Backend service unavailable'))
    }

    window.addEventListener('drivelegal:auth-failed', handleAuthFailure)
    window.addEventListener('drivelegal:network-error', handleNetworkError)
    return () => {
      window.removeEventListener('drivelegal:auth-failed', handleAuthFailure)
      window.removeEventListener('drivelegal:network-error', handleNetworkError)
    }
  }, [user?.uid])

  const api = useMemo(
    () => ({
      user,
      role,
      token,
      loading,
      sessionError,
      signUp: authService.signUp,
      login: authService.login,
      logout: async () => {
        if (user?.uid) clearCachedRole(user.uid)
        clearSession()
        setUser(null)
        setRole(null)
        setToken(null)
        setSessionError(null)
        return authService.logout()
      },
      googleLogin: authService.googleLogin,
      resetPassword: authService.resetPassword,
      refreshRole,
    }),
    [user, role, token, loading, sessionError]
  )

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>
}
