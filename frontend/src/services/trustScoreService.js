import { apiClient } from './apiClient'

export async function fetchTrustScore(userId) {
  try {
    const response = await apiClient.get('/api/trust-score', {
      params: { userId }
    })
    return response.data
  } catch (error) {
    console.error('fetchTrustScore API error:', error)
    throw error
  }
}

export async function recalculateTrustScore(userId) {
  try {
    const response = await apiClient.post('/api/trust-score/recalculate', { userId })
    return response.data
  } catch (error) {
    console.error('recalculateTrustScore API error:', error)
    throw error
  }
}
