import axios from 'axios'
import { clearSession, getAccessToken, isSessionExpired, readSession } from './sessionStore'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export const apiClient = axios.create({
  baseURL: API_BASE,
})



function notifyAuthFailure(type = 'session-expired') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('drivelegal:auth-failed', { detail: { type } }))
}

apiClient.interceptors.request.use((config) => {
  if (config?.skipAuth) return config


  const session = readSession()
  if (session && isSessionExpired(session)) {
    clearSession()
    notifyAuthFailure('session-expired')
    return Promise.reject(new axios.Cancel('Session expired'))
  }

  const token = getAccessToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network level errors (CORS, connection refused) show up without response
    if (!error.response) {
      console.error('[apiClient] Network or CORS error:', error.message || error)
      // Dispatch a global event so UI can show a friendly message
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('drivelegal:network-error', { detail: { message: error.message } }))
      }
      return Promise.reject(error)
    }

    const status = error?.response?.status
    if (status === 401) {
      clearSession()
      notifyAuthFailure(error?.response?.data?.error?.code || 'unauthorized')
    }
    return Promise.reject(error)
  }
)
