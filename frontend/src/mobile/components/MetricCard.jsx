import React from 'react'

export default function MetricCard({ label, metric }) {
  return (
    <div className="glass-card p-3">
      <div className="text-xs text-[#94A3B8]">{label}</div>
      <div className="font-extrabold text-2xl mt-1">{metric}</div>
    </div>
  )
}
