import React from 'react'

export default function SecondaryButton({ children, onClick, className = '' }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg border border-white/6 text-sm ${className}`}>{children}</button>
  )
}
