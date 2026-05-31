import React from 'react'

export function InfoCard({ title, subtitle, icon: Icon, children, className = '', rightElement }) {
  return (
    <div 
      className={`rounded-2xl p-4 border border-white/5 ${className}`}
      style={{ background: 'var(--color-surface, #131A22)' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Icon size={20} />
            </div>
          )}
          <div>
            <h4 className="text-[16px] font-bold text-[#F8FAFC]">{title}</h4>
            {subtitle && <p className="text-[14px] text-[#94A3B8] mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {rightElement && <div>{rightElement}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}
