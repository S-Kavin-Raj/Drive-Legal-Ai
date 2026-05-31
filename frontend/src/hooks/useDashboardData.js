import { useEffect, useState } from 'react'
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../hooks/useAuth'
import { evaluateAwareness } from '../services/awarenessService'

export function useDashboardData() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  // Awareness/gamification features archived for Drive Mode pivot
  const [awarenessRecord, setAwarenessRecord] = useState(null)
  const [awarenessHistory, setAwarenessHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasEvaluated, setHasEvaluated] = useState(false)

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    setLoading(true)

    if (!hasEvaluated) {
      evaluateAwareness(user.uid)
        .catch((err) => console.error('Awareness evaluation failed:', err))
        .finally(() => setHasEvaluated(true))
    }

    // 1. Real-time User Profile Listener
    const userDocRef = doc(db, 'users', user.uid)
    const unsubUser = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.data())
        } else {
          setProfile(null)
        }
        setLoading(false)
      },
      (err) => {
        console.error('Error listening to user doc:', err)
        setError(err)
        setLoading(false)
      }
    )

    // NOTE: Awareness trend real-time subscription removed as part of
    // product pivot to Real-Time Driver Compliance Assistant. Historical
    // copy of the original hook saved to src/archive/hooks/useDashboardData_full.js
    return () => {
      unsubUser()
    }
  }, [user?.uid, hasEvaluated])

  return {
    profile,
    awarenessRecord,
    awarenessHistory,
    loading,
    error,
  }
}
