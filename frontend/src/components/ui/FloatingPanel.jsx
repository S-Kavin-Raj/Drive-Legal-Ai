import React from 'react'

export function FloatingPanel({ children, className = '', position = 'bottom', ...props }) {
  const positionClasses = {
    top: 'top-4 left-4 right-4',
    bottom: 'bottom-4 left-4 right-4',
    center: 'top-1/2 left-4 right-4 -translate-y-1/2',
  }

  return (
    <div 
      className={`absolute z-10 ${positionClasses[position]} ${className}`}
      {...props}
    >
      <div 
        className="rounded-3xl border border-white/10 shadow-2xl overflow-hidden p-4"
        style={{
          background: 'var(--color-surface, #131A22)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }}
      >
        {children}
      </div>
    </div>
  )
}
