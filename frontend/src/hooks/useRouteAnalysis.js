import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../hooks/useAuth'

export function useRouteAnalysis() {
  const { user } = useAuth()
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    setLoading(true)

    const routeRef = collection(db, 'routeAnalyses')
      const qUserId = query(
        routeRef,
        where('userId', '==', user.uid)
      )

      const unsub = onSnapshot(
        qUserId,
        (snap) => {
          const all = []
          snap.forEach((doc) => all.push({ id: doc.id, ...doc.data() }))
          all.sort((a, b) => {
            const ta = a.createdAt?.seconds || 0
            const tb = b.createdAt?.seconds || 0
            return tb - ta
          })
          setRoutes(all)
          setLoading(false)
        },
        (err) => {
          console.error('route analysis subscription error', err)
          setError(err)
          setLoading(false)
        }
      )

      return unsub
  }, [user?.uid])

  return {
    routes,
    loading,
    error,
  }
}
