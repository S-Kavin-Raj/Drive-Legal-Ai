import React from 'react'

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`w-full py-4 px-6 rounded-2xl font-bold text-[16px] transition-transform active:scale-95 ${className}`}
      style={{
        background: 'var(--color-primary, #4DA3FF)',
        color: '#FFFFFF',
        boxShadow: '0 4px 14px 0 rgba(77, 163, 255, 0.39)'
      }}
      {...props}
    >
      {children}
    </button>
  )
}
