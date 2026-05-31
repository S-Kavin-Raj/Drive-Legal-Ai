import React from 'react'

export function MetricCard({ title, value, unit, icon: Icon, className = '' }) {
  return (
    <div 
      className={`rounded-2xl border border-white/5 p-4 flex flex-col justify-between ${className}`}
      style={{
        background: 'var(--color-surface, #131A22)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-bold uppercase tracking-widest text-[#94A3B8]">{title}</span>
        {Icon && <Icon size={16} className="text-[#3B82F6]" />}
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-[32px] font-black text-[#F8FAFC] leading-none">{value}</span>
        {unit && <span className="text-[14px] text-[#94A3B8] font-bold">{unit}</span>}
      </div>
    </div>
  )
}
