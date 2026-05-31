const STORAGE_KEY = 'drivelegal-auth-session'

function safeParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function readSession() {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? safeParse(raw) : null
}

export function writeSession(session) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

export function normalizeSessionUser(user) {
  if (!user || typeof user !== 'object') return null
  const uid = user.uid || user.userId || null
  const email = user.email || null
  const name = user.name || null
  const role = user.role || null

  return {
    ...user,
    uid,
    userId: user.userId || uid,
    email,
    name,
    role,
  }
}

export function isSessionExpired(session) {
  if (!session?.token) return true
  if (session.expiresAt) {
    const expiresAt = new Date(session.expiresAt).getTime()
    if (!Number.isNaN(expiresAt)) {
      return Date.now() >= expiresAt
    }
  }
  const payload = decodeJwtPayload(session.token)
  if (!payload?.exp) return true
  return Date.now() >= payload.exp * 1000
}

export function getAccessToken() {
  const session = readSession()
  if (!session || isSessionExpired(session)) {
    if (session) clearSession()
    return null
  }
  return session.token || null
}

export function getStoredUser() {
  const session = readSession()
  if (!session || isSessionExpired(session)) return null
  return normalizeSessionUser(session.user)
}

export function getStoredRole() {
  return getStoredUser()?.role || null
}
