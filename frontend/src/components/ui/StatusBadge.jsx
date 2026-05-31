import React from 'react'

export function StatusBadge({ status = 'success', text, className = '' }) {
  const statusColors = {
    success: 'var(--color-success, #22C55E)',
    warning: 'var(--color-warning, #F59E0B)',
    danger: 'var(--color-danger, #EF4444)',
    default: 'var(--color-primary, #4DA3FF)'
  }

  const color = statusColors[status] || statusColors.default

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold tracking-widest uppercase ${className}`}
      style={{
        color: color,
        backgroundColor: `${color}1A`, // 10% opacity
        border: `1px solid ${color}33` // 20% opacity
      }}
    >
      <span 
        className="h-1.5 w-1.5 rounded-full animate-pulse" 
        style={{ backgroundColor: color }}
      />
      {text}
    </div>
  )
}
