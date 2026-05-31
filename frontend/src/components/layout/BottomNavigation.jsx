import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Compass, Navigation, FileText, Zap, Settings } from 'lucide-react'

const TABS = [
  { id: 'home',      label: 'Home',      icon: Home,        path: '/dashboard' },
  { id: 'plan',      label: 'Plan',      icon: Compass,     path: '/plan-trip' },
  { id: 'drive',     label: 'Drive',     icon: Navigation,  path: '/driving-mode' },
  { id: 'challan',   label: 'Challan',   icon: FileText,    path: '/challan-manager' },
  { id: 'assistant', label: 'RTO AI',    icon: Zap,         path: '/traffic-assistant' },
  { id: 'settings',  label: 'Settings',  icon: Settings,    path: '/settings' },
]

export function BottomNavigation() {
  const navigate  = useNavigate()
  const location  = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass-strong sheet-shadow"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-[62px] max-w-[440px] mx-auto px-1">
        {TABS.map(({ id, label, icon: Icon, path }) => {
          const isActive = location.pathname.startsWith(path)
          return (
            <button
              key={id}
              onClick={() => navigate(path)}
              className="flex flex-col items-center justify-center gap-[3px] w-[58px] h-full transition-transform active:scale-90 select-none"
            >
              <div
                className="relative flex items-center justify-center w-9 h-9 rounded-2xl transition-all duration-300"
                style={isActive ? {
                  background: 'rgba(137,0,242,0.18)',
                  boxShadow: '0 0 12px rgba(137,0,242,0.4)',
                } : {}}
              >
                <Icon
                  size={isActive ? 21 : 20}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  style={{ color: isActive ? '#8900F2' : '#667085' }}
                />
                {isActive && (
                  <span
                    className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: '#8900F2', boxShadow: '0 0 6px #8900F2' }}
                  />
                )}
              </div>
              <span
                className="text-[9px] font-semibold tracking-wide"
                style={{ color: isActive ? '#8900F2' : '#667085' }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
