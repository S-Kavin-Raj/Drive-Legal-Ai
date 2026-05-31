import React from 'react'

export function GlassCard({ children, className = '', ...props }) {
  return (
    <div 
      className={`rounded-2xl border border-white/5 overflow-hidden shadow-lg ${className}`}
      style={{
        background: 'var(--color-glass-background, rgba(255, 255, 255, 0.04))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      {...props}
    >
      {children}
    </div>
  )
}
