import React from 'react'

export default function PrimaryButton({ children, onClick, className = '' }) {
  return (
    <button onClick={onClick} className={`btn-primary ${className}`}>{children}</button>
  )
}
