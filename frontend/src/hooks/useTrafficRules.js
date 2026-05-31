import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useTrafficRules() {
  const [rules, setRules] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRules() {
      try {
        const snapshot = await getDocs(collection(db, 'trafficRules'))
        const fetchedRules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setRules(fetchedRules)
        setCount(snapshot.size)
      } catch (err) {
        console.error("Error fetching trafficRules:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchRules()
  }, [])

  return { rules, count, loading }
}
