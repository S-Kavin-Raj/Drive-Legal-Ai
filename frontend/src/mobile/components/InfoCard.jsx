import React from 'react'

export default function InfoCard({ title, value, children }) {
  return (
    <div className="glass-card p-3">
      <div className="text-xs text-[#94A3B8]">{title}</div>
      <div className="font-bold text-lg mt-1">{value}</div>
      {children}
    </div>
  )
}
