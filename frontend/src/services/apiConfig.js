export const DEFAULT_API_BASE_URL = 'https://drive-legal-ai-production.up.railway.app'

export const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '')

export function buildApiUrl(path = '') {
  const normalizedPath = String(path || '').replace(/^\/+/, '')
  return normalizedPath ? `${API_BASE_URL}/${normalizedPath}` : API_BASE_URL
}