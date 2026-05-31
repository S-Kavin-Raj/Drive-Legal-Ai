import React from 'react'
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/mobile/home', label: 'Home' },
  { to: '/mobile/plan', label: 'Trip' },
  { to: '/mobile/drive', label: 'Drive' },
  { to: '/mobile/challan', label: 'Challan' },
  { to: '/mobile/assistant', label: 'Assistant' },
  { to: '/mobile/settings', label: 'Settings' },
]

export default function BottomNav() {
  return (
    <nav className="mobile-bottom-nav">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => `text-xs ${isActive ? 'text-[#4DA3FF] font-bold' : 'text-[#94A3B8]'}`}>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
