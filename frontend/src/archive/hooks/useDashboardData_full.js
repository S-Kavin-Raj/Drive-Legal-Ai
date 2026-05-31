// ARCHIVE: Full original copy of useDashboardData.js (backed up before refactor)
// Location in active codebase: ../hooks/useDashboardData.js
// This file is retained for historical reference and can be restored if needed.

/*
import { useEffect, useState } from 'react'
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../hooks/useAuth'
import { evaluateAwareness } from '../services/awarenessService'

export function useDashboardData() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
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

    // 2. Real-time Awareness Scores Trend Listener
    const scoresRef = collection(db, 'awarenessScores')
    const q = query(
      scoresRef,
      where('userId', '==', user.uid)
    )

    const unsubScores = onSnapshot(
      q,
      (snapshot) => {
        const history = []
        snapshot.forEach((d) => {
          history.push({ id: d.id, ...d.data() })
        })
        
        // Sort in memory by timestamp ascending
        history.sort((a, b) => {
          const tA = a.timestamp?.seconds || a.createdAt?.seconds || (a.timestamp instanceof Date ? a.timestamp.getTime() : 0)
          const tB = b.timestamp?.seconds || b.createdAt?.seconds || (b.timestamp instanceof Date ? b.timestamp.getTime() : 0)
          return tA - tB
        })

        setAwarenessHistory(history)
        
        // Latest record is the last one in chronological order
        if (history.length > 0) {
          setAwarenessRecord(history[history.length - 1])
        } else {
          setAwarenessRecord(null)
        }
      },
      (err) => {
        console.error('Error listening to awareness scores:', err)
        setError(err)
      }
    )

    return () => {
      unsubUser()
      unsubScores()
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
*/
