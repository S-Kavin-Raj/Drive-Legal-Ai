import React, { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { checkOnboardingStatus } from '../../services/userProfileService'
import AuthLoader from '../AuthLoader'
import toast from 'react-hot-toast'

export default function OnboardingGuard() {
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()

  const [checking, setChecking] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [redirectLogin, setRedirectLogin] = useState(false)

  // Guard renders are intentionally quiet in production

  useEffect(() => {
    let mounted = true

    if (authLoading || !user?.uid) {
      return
    }

    // Allow the onboarding page itself to pass through without recursion
    if (location.pathname === '/onboarding') {
      setChecking(false)
      return
    }

    setChecking(true)
    checkOnboardingStatus(user.uid)
      .then(({ completed: done, error }) => {
        if (!mounted) return
        if (error) {
          throw error
        }
        setCompleted(done)
      })
      .catch((err) => {
        console.error('[OnboardingGuard] check failed:', err)
        if (mounted) {
          const errMsg = String(err.message || '').toLowerCase()
          const isPermissionDenied = err.code === 'permission-denied' || 
                                     errMsg.includes('permission') || 
                                     errMsg.includes('unauthenticated')

          if (isPermissionDenied) {
            console.warn('[OnboardingGuard] Firestore permission error gracefully handled. Redirecting to login.')
            toast.error('Session expired or unauthorized. Please login again.')
          } else {
            toast.error('Failed to load profile. Redirecting to login.')
          }
          setRedirectLogin(true)
        }
      })
      .finally(() => {
        if (mounted) setChecking(false)
      })

    return () => { mounted = false }
  }, [user?.uid, authLoading, location.pathname])

  // Requirement 1: OnboardingGuard must NEVER run when user is null
  if (authLoading) {
    return <AuthLoader />
  }

  if (!user || redirectLogin) {
    return <Navigate to="/login" replace />
  }

  // Only then check onboarding status
  if (checking) {
    return <AuthLoader />
  }

  // Onboarding not done — redirect (skip if already on /onboarding)
  if (!completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
