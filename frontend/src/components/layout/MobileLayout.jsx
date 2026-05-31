import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNavigation } from './BottomNavigation'

// Routes where the page fully owns the viewport (map-first)
const FULL_VIEWPORT_ROUTES = ['/dashboard', '/plan-trip', '/driving-mode']

export function MobileLayout() {
  const { pathname } = useLocation()
  const isFullViewport = FULL_VIEWPORT_ROUTES.some((r) => pathname.startsWith(r))

  return (
    <div
      className="relative mx-auto overflow-hidden"
      style={{
        maxWidth: '440px',
        width: '100%',
        height: '100dvh',
        background: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      {/* Page content */}
      <div
        className={isFullViewport ? 'absolute inset-0' : 'h-full overflow-y-auto scrollbar-hide pb-[62px]'}
      >
        <Outlet />
      </div>

      <BottomNavigation />
    </div>
  )
}
