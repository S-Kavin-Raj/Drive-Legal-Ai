import { useQuery } from '@tanstack/react-query'
import { fetchRecommendations } from '../services/recommendationService'

export function useRecommendations({ riskScore, complianceScore, documentStatus, challansCount }) {
  const docStatusKey = JSON.stringify(documentStatus || {})

  const { data: recommendations, isLoading, error } = useQuery({
    queryKey: ['recommendations', riskScore, complianceScore, docStatusKey, challansCount],
    queryFn: () =>
      fetchRecommendations({
        riskScore,
        complianceScore,
        documentStatus,
        challansCount,
      }),
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: complianceScore !== undefined,
  })

  return {
    recommendations: recommendations || [],
    loading: isLoading,
    error,
  }
}
