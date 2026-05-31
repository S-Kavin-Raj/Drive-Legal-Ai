import axios from 'axios'
import { clearSession, getAccessToken, isSessionExpired, readSession, writeSession } from './sessionStore'
import { API_BASE_URL } from './apiConfig'
import { auth } from '../firebase/config'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

function notifyAuthFailure(type = 'session-expired') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('drivelegal:auth-failed', { detail: { type } }))
}

apiClient.interceptors.request.use(async (config) => {
  console.log(`[apiClient Request] URL: ${config.baseURL || ''}${config.url || ''}`)
  console.log(`[apiClient Request] Payload:`, config.data)

  if (config?.skipAuth) return config

  let token = getAccessToken()

  if (!token && !config.url.includes('/api/auth/')) {
    console.log('[apiClient] Session token absent or expired. Attempting Firebase fallback/refresh...')
    try {
      const currentUser = auth?.currentUser
      if (currentUser) {
        console.log('[apiClient] Firebase currentUser detected. Forcing token refresh...')
        const idToken = await currentUser.getIdToken(true)
        console.log('[apiClient] Firebase ID token acquired successfully')

        console.log('[apiClient] Syncing session with fresh ID token...')
        const syncResponse = await axios.post(`${API_BASE_URL}/api/auth/sync`, {
          firebaseToken: idToken,
          user: {
            userId: currentUser.uid,
            email: currentUser.email,
            name: currentUser.displayName
          }
        }, { skipAuth: true })

        if (syncResponse.data?.token) {
          const freshSession = {
            token: syncResponse.data.token,
            expiresAt: syncResponse.data.expiresAt,
            user: syncResponse.data.user
          }
          writeSession(freshSession)
          token = freshSession.token
          console.log('[apiClient] Custom JWT session synced successfully after refresh')
        }
      }
    } catch (firebaseErr) {
      console.warn('[apiClient] Firebase auto-refresh sync failed:', firebaseErr.message)
    }
  }

  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
    console.log('[apiClient] Token attached')
  } else {
    console.log('[apiClient] No token found')
    if (typeof window !== 'undefined' && !config.url.includes('/api/auth/')) {
      console.warn('[apiClient] Unauthenticated request. Redirecting to login.')
      notifyAuthFailure('unauthenticated')
    }
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[apiClient Response] URL: ${response.config.url || ''} Status: ${response.status}`)
    console.log(`[apiClient Response] Body:`, response.data)
    return response
  },
  (error) => {
    if (!error.response) {
      console.error('[apiClient] Network or CORS error (no response received):', error.message || error)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('drivelegal:network-error', { detail: { message: error.message } }))
      }
      return Promise.reject(error)
    }

    console.error(`[apiClient Response Error] URL: ${error.response.config.url || ''} Status: ${error.response.status}`)
    console.error(`[apiClient Response Error] Body:`, error.response.data)

    const status = error?.response?.status
    if (status === 401) {
      clearSession()
      notifyAuthFailure(error?.response?.data?.error?.code || 'unauthorized')
    }
    return Promise.reject(error)
  }
)
