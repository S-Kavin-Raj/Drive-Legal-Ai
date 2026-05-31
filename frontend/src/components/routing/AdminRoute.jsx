import React from 'react'
import ProtectedRoute from './ProtectedRoute'

export default function AdminRoute(props) {
  return <ProtectedRoute allowedRoles={[ 'admin' ]} {...props} />
}
