import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../hooks/useAuth'

export function useChallans() {
  const { user } = useAuth()
  const [challans, setChallans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    setLoading(true)
    const challanRef = collection(db, 'challanReports')
    const qUserId = query(challanRef, where('userId', '==', user.uid))

    const unsub = onSnapshot(
      qUserId,
      (snapshot) => {
        const records = []
        snapshot.forEach((d) => records.push({ id: d.id, ...d.data() }))
        records.sort((a, b) => {
          const tA = a.createdAt?.seconds || a.timestamp?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() : (a.timestamp instanceof Date ? a.timestamp.getTime() : 0))
          const tB = b.createdAt?.seconds || b.timestamp?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() : (b.timestamp instanceof Date ? b.timestamp.getTime() : 0))
          return tB - tA
        })
        setChallans(records)
        setLoading(false)
      },
      (err) => {
        console.error('Error listening to challans:', err)
        setError(err)
        setLoading(false)
      }
    )

    return unsub
  }, [user?.uid])

  return {
    challans,
    loading,
    error,
  }
}
