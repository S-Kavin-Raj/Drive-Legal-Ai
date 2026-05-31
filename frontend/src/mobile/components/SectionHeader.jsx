import React from 'react'

export default function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-3">
      <h3 className="text-base font-bold">{title}</h3>
      {subtitle && <p className="text-xs text-[#94A3B8] mt-1">{subtitle}</p>}
    </div>
  )
}
