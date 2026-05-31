import { useMemo } from 'react'
import { useDashboardData } from './useDashboardData'
import { useRouteAnalysis } from './useRouteAnalysis'
import { useCompliance } from './useCompliance'
import { useChallans } from './useChallans'

export function useDashboard() {
  const {
    profile,
    awarenessRecord,
    awarenessHistory,
    loading: profileLoading,
    error: profileError,
  } = useDashboardData()

  const {
    routes,
    loading: routesLoading,
    error: routesError,
  } = useRouteAnalysis()

  const {
    documents,
    readinessScore,
    status,
    issues,
    expiringSoon,
    complianceHistory,
    lastEvaluatedAt,
    loading: complianceLoading,
    error: complianceError,
    refresh: refreshCompliance,
  } = useCompliance()

  const {
    challans,
    loading: challansLoading,
    error: challansError,
  } = useChallans()

  // Default welcome recommendation when no active route is loaded
  const defaultRecs = useMemo(() => [
    {
      id: 'rec_default_welcome',
      category: 'General',
      priority: 'low',
      title: 'Plan a Safe Journey',
      reason: 'No active route analysis selected.',
      description: 'Provide a starting point and destination to trace coordinates and generate dynamic legal safety notifications.'
    }
  ], [])

  // Retrieve recommendations directly from the active route document stored in Firestore
  const recommendations = useMemo(() => {
    return (routes && routes.length > 0 && routes[0].recommendations) || defaultRecs
  }, [routes, defaultRecs])

  const loading = profileLoading || routesLoading || complianceLoading || challansLoading
  const error = profileError || routesError || complianceError || challansError

  return useMemo(() => ({
    profile,
    awarenessRecord,
    awarenessHistory,
    routes,
    documents,
    readinessScore,
    status,
    issues,
    expiringSoon,
    complianceHistory,
    lastEvaluatedAt,
    challans,
    recommendations,
    loading,
    error,
    refreshCompliance,
  }), [
    profile,
    awarenessRecord,
    awarenessHistory,
    routes,
    documents,
    readinessScore,
    status,
    issues,
    expiringSoon,
    complianceHistory,
    lastEvaluatedAt,
    challans,
    recommendations,
    loading,
    error,
    refreshCompliance,
  ])
}
