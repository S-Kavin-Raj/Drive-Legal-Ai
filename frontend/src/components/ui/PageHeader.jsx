import React from 'react'

export function PageHeader({ title, subtitle, rightElement, className = '' }) {
  return (
    <div className={`px-4 pt-6 pb-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-black text-[#F8FAFC] tracking-tight leading-tight">{title}</h1>
          {subtitle && <p className="text-[14px] text-[#94A3B8] mt-1 font-medium">{subtitle}</p>}
        </div>
        {rightElement && <div>{rightElement}</div>}
      </div>
    </div>
  )
}
