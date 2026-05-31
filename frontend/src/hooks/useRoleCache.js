// simple localStorage role cache with TTL
const CACHE_KEY = 'drivelegal_rbac_v1'
const TTL_MS = 5 * 60 * 1000 // 5 minutes

export function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function writeCache(obj) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj))
  } catch {
    // ignore cache writing exceptions
  }
}

export function getCachedRole(uid) {
  if (!uid || typeof uid !== 'string' || uid === '__proto__' || uid === 'constructor' || uid === 'prototype') return null
  const cache = readCache()
  const entry = Object.prototype.hasOwnProperty.call(cache, uid) ? cache[uid] : null
  if (!entry) return null
  if (Date.now() - (entry.ts || 0) > TTL_MS) {
    delete cache[uid]
    writeCache(cache)
    return null
  }
  return entry.role
}

export function setCachedRole(uid, role) {
  if (!uid || typeof uid !== 'string' || uid === '__proto__' || uid === 'constructor' || uid === 'prototype') return
  const cache = readCache()
  cache[uid] = { role, ts: Date.now() }
  writeCache(cache)
}

export function clearCachedRole(uid) {
  if (!uid || typeof uid !== 'string' || uid === '__proto__' || uid === 'constructor' || uid === 'prototype') return
  const cache = readCache()
  if (Object.prototype.hasOwnProperty.call(cache, uid)) {
    delete cache[uid]
    writeCache(cache)
  }
}
