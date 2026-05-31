import React from 'react'

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`w-full py-4 px-6 rounded-2xl font-bold text-[16px] transition-transform active:scale-95 border border-white/10 ${className}`}
      style={{
        background: 'var(--color-surface, #131A22)',
        color: 'var(--color-text-primary, #F8FAFC)'
      }}
      {...props}
    >
      {children}
    </button>
  )
}
