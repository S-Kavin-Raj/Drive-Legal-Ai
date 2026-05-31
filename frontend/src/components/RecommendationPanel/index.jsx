import React, { memo } from 'react'
import { Lightbulb, Info, AlertTriangle, ShieldAlert } from 'lucide-react'

function RecommendationPanel({ recommendations, loading, error }) {
  return (
    <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
        <Lightbulb size={14} className="text-amber-450" />
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AI Recommendations</h3>
      </div>

      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-10 bg-slate-800 rounded" />
          <div className="h-10 bg-slate-800 rounded" />
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl border border-red-950 bg-red-950/10 text-red-500 text-[10px]">
          Failed to compile legal directives.
        </div>
      )}

      {!loading && !error && recommendations.length === 0 && (
        <div className="p-4 rounded-xl border border-slate-900 bg-black/40 text-center text-[10px] text-slate-500 font-semibold select-none">
          No advisory notifications active.
        </div>
      )}

      {!loading && !error && recommendations.length > 0 && (
        <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
          {recommendations.map((rec) => {
            let priorityBorder = ''
            let Icon = Info

            if (rec.priority === 'high') {
              priorityBorder = 'border-red-950/40 bg-red-950/5 text-red-400'
              Icon = ShieldAlert
            } else if (rec.priority === 'medium') {
              priorityBorder = 'border-amber-950/40 bg-amber-950/5 text-amber-400'
              Icon = AlertTriangle
            } else {
              priorityBorder = 'border-slate-900 bg-slate-950/10 text-slate-400'
              Icon = Info
            }

            return (
              <div key={rec.id} className={`flex gap-2.5 p-3 rounded-xl border ${priorityBorder} text-[10px]`}>
                <div className="mt-0.5">
                  <Icon size={14} />
                </div>
                <div>
                  <span className="font-bold uppercase tracking-wider text-[8px] text-slate-500">
                    {rec.category}
                  </span>
                  <h4 className="font-bold mt-0.5 text-slate-200 leading-snug">{rec.title}</h4>
                  <p className="text-slate-400 mt-1 leading-relaxed">{rec.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default memo(RecommendationPanel)
