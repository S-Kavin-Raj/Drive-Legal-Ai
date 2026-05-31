import { apiClient } from './apiClient'
import { fetchPlaceCoordinates } from './orsService'

export async function analyzeRoute({ source, destination, userId, complianceScore, documentStatus }) {
  try {
    const normalizedSource = typeof source === 'string' ? await fetchPlaceCoordinates(source) : source
    const normalizedDestination = typeof destination === 'string' ? await fetchPlaceCoordinates(destination) : destination

    const res = await apiClient.post('/api/route-risk', {
      source: normalizedSource,
      destination: normalizedDestination,
      userId,
      complianceScore,
      documentStatus,
    })
    return res.data
  } catch (err) {
    console.error('analyzeRoute API error:', err)
    throw err
  }
}
