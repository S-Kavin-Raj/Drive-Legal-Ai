import { useState, useEffect, useCallback } from 'react'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from './useAuth'

/**
 * useUserProfile
 *
 * Subscribes to the current user's Firestore document at users/{userId}.
 * Returns the full profile object, a loading flag, and an error state.
 *
 * Schema reference:
 * {
 *   vehicleType: 'bike' | 'car' | 'commercial',
 *   onboardingCompleted: boolean,
 *   complianceProfile: { [key: string]: boolean },
 *   createdAt: Timestamp,
 *   updatedAt: Timestamp
 * }
 */
export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user?.uid) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const ref = doc(db, 'users', user.uid)

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setProfile({ id: snap.id, ...snap.data() })
        } else {
          // Document does not exist yet — onboarding needed
          setProfile(null)
        }
        setLoading(false)
      },
      (err) => {
        console.error('[useUserProfile] Firestore error:', err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user?.uid])

  const refetch = useCallback(async () => {
    if (!user?.uid) return null
    try {
      const snap = await getDoc(doc(db, 'users', user.uid))
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() }
        setProfile(data)
        return data
      }
      return null
    } catch (err) {
      console.error('[useUserProfile] refetch error:', err)
      setError(err)
      return null
    }
  }, [user?.uid])

  return { profile, loading, error, refetch }
}
