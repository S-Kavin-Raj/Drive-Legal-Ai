import { apiClient } from './apiClient'

export async function evaluateAwareness(userId) {
  try {
    const res = await apiClient.post('/api/awareness/evaluate', { userId })
    return res.data
  } catch (err) {
    console.error('evaluateAwareness API error:', err)
    throw err
  }
}

export async function fetchAwarenessHistory(userId, limit = 20) {
  try {
    const res = await apiClient.get(`/api/awareness/history/${userId}`, {
      params: { limit },
    })
    return res.data
  } catch (err) {
    console.error('fetchAwarenessHistory API error:', err)
    throw err
  }
}
