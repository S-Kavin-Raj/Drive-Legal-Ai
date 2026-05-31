import { apiClient } from './apiClient'

export async function fetchRecommendations({ riskScore, complianceScore, documentStatus, challansCount }) {
  try {
    const res = await apiClient.post('/api/recommendations', {
      riskScore,
      complianceScore,
      documentStatus,
      challansCount,
    })
    return res.data?.recommendations || []
  } catch (err) {
    console.error('fetchRecommendations error:', err)
    throw err
  }
}
