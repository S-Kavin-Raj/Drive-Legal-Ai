import React from 'react'
import { FileSignature, AlertCircle, Calendar } from 'lucide-react'

export default function ChallanIntelligence({ challans, loading }) {
  if (loading) {
    return (
      <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-4 animate-pulse">
        <div className="h-4 w-1/4 bg-slate-800 rounded" />
        <div className="h-10 bg-slate-800 rounded" />
      </div>
    )
  }

  return (
    <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-900 pb-3">
        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
          <FileSignature size={16} />
        </div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Challan Intelligence</h3>
      </div>

      {challans.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
          No traffic citations logged. Congratulations on a clean record!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[300px] overflow-y-auto pr-1">
          {challans.map((challan) => {
            let dateStr = 'N/A'
            const ts = challan.createdAt || challan.timestamp
            if (ts) {
              const dateObj = ts.toDate ? ts.toDate() : new Date(ts)
              dateStr = dateObj.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            }

            return (
                <div key={challan.id} className="p-3.5 rounded-xl border border-red-950/40 bg-red-950/5 flex items-center justify-between gap-4 text-xs">
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-200 leading-snug flex items-center gap-1.5">
                    <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                      <span className="truncate">{challan.violation || challan.violationType || 'Unclassified Violation'}</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-none">
                      MV Act Standard: <span className="font-semibold text-slate-400">{challan.matchedRule?.section || challan.ruleMatched || 'Section 177'}</span>
                  </p>
                  <div className="flex items-center gap-1 text-[9px] text-slate-650 mt-1.5 leading-none">
                    <Calendar size={10} />
                    <span>{dateStr}</span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-[9px] text-slate-550 block font-bold uppercase tracking-wider">Penalty</span>
                  <span className="text-sm font-extrabold text-red-500">₹{challan.fine ?? challan.fineAmount ?? 0}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
