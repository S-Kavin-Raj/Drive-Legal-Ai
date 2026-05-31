import React from 'react'

export default function StatusBadge({ children, variant = 'default' }) {
  const color = variant === 'success' ? 'text-[#22C55E]' : variant === 'warning' ? 'text-[#F59E0B]' : variant === 'danger' ? 'text-[#EF4444]' : 'text-[#94A3B8]'
  return (
    <span className={`text-xs font-bold ${color} bg-black/10 px-2 py-1 rounded`}>{children}</span>
  )
}
