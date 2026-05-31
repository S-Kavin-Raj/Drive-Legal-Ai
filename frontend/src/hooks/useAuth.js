import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'

/**
 * Hook to access the AuthContext.
 * Separated from AuthContext.jsx to make Vite Fast Refresh happy —
 * a file must export only components OR hooks, not both.
 */
export function useAuth() {
  return useContext(AuthContext)
}
