import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import AuthLoader from '../AuthLoader'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <AuthLoader />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
