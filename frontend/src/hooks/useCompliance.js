import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { evaluateCompliance, fetchComplianceHistory } from '../services/complianceService'

const DEFAULT_DOCUMENTS = {
  license: 'Missing',
  rc: 'Missing',
  insurance: 'Missing',
  puc: 'Missing',
}

function normalizeDocumentMap(evaluation) {
  return {
    ...DEFAULT_DOCUMENTS,
    ...(evaluation?.documentStatusMap || {}),
  }
}

export function useCompliance() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState(DEFAULT_DOCUMENTS)
  const [readinessScore, setReadinessScore] = useState(0)
  const [status, setStatus] = useState('Not Ready')
  const [issues, setIssues] = useState([])
  const [expiringSoon, setExpiringSoon] = useState([])
  const [complianceHistory, setComplianceHistory] = useState([])
  const [lastEvaluatedAt, setLastEvaluatedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const refresh = () => setRefreshTrigger((prev) => prev + 1)

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false)
      setDocuments(DEFAULT_DOCUMENTS)
      setReadinessScore(0)
      setStatus('Not Ready')
      setIssues([])
      setExpiringSoon([])
      setComplianceHistory([])
      setLastEvaluatedAt(null)
      return
    }

    let cancelled = false

    async function loadCompliance() {
      setLoading(true)
      setError(null)

      try {
        const [evaluation, historyResponse] = await Promise.all([
          evaluateCompliance(user.uid),
          fetchComplianceHistory(user.uid),
        ])

        if (cancelled) return

        setDocuments(normalizeDocumentMap(evaluation))
        setReadinessScore(Number(evaluation?.readinessScore || 0))
        setStatus(evaluation?.status || 'Not Ready')
        setIssues(Array.isArray(evaluation?.issues) ? evaluation.issues : [])
        setExpiringSoon(Array.isArray(evaluation?.expiringSoon) ? evaluation.expiringSoon : [])
        setComplianceHistory(Array.isArray(historyResponse?.history) ? historyResponse.history : [])
        setLastEvaluatedAt(evaluation?.evaluatedAt || null)
      } catch (err) {
        if (cancelled) return
        console.error('Error loading compliance data:', err)
        setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCompliance()

    return () => {
      cancelled = true
    }
  }, [user?.uid, refreshTrigger])

  return {
    documents,
    readinessScore,
    status,
    issues,
    expiringSoon,
    complianceHistory,
    lastEvaluatedAt,
    loading,
    error,
    refresh,
  }
}
