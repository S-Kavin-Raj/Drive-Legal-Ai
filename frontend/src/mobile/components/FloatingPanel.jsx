import React from 'react'

export default function FloatingPanel({ children, className = '' }) {
  return (
    <div className={`floating-panel ${className}`}>
      <div className="glass-card p-3">{children}</div>
    </div>
  )
}
