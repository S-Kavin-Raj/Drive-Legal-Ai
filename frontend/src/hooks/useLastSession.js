import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from './useAuth'

/**
 * useLastSession
 * 
 * Fetches the most recent completed driving session for the authenticated user.
 * Returns { session, loading, error }.
 */
export function useLastSession() {
  const { user } = useAuth()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchLastSession() {
      setLoading(true)
      setError(null)
      try {
        const q = query(
          collection(db, 'drivingSessions'),
          where('userId', '==', user.uid),
          where('status', '==', 'Completed'),
          orderBy('endedAt', 'desc'),
          limit(1)
        )
        const snap = await getDocs(q)
        if (!cancelled) {
          if (!snap.empty) {
            setSession({ id: snap.docs[0].id, ...snap.docs[0].data() })
          } else {
            setSession(null)
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[useLastSession] Failed to fetch last session:', err.message)
          setError(err)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchLastSession()
    return () => { cancelled = true }
  }, [user?.uid])

  return { session, loading, error }
}
