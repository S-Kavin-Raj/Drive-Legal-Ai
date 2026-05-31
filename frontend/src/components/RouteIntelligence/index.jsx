import React, { memo } from 'react'
import { Navigation, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react'

function RouteIntelligence({ routes, loading }) {
  if (loading) {
    return (
      <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-4 animate-pulse">
        <div className="h-4 w-1/4 bg-slate-800 rounded" />
        <div className="h-10 bg-slate-800 rounded" />
        <div className="h-10 bg-slate-800 rounded" />
      </div>
    )
  }

  return (
    <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-900 pb-3">
        <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
          <Navigation size={16} />
        </div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Route Intelligence</h3>
      </div>

      {routes.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
          No analyzed routes logged in your profile database.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-900 text-[10px] font-bold text-slate-500 uppercase">
                <th className="py-2.5 px-1">Planned Route</th>
                <th className="py-2.5 px-3">Risk Assessment</th>
                <th className="py-2.5 px-3 text-right">Analysis Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {routes.map((route) => {
                let dateStr = 'N/A'
                if (route.timestamp) {
                  const dateObj = route.timestamp.toDate ? route.timestamp.toDate() : new Date(route.timestamp)
                  dateStr = dateObj.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }

                let badgeColor = ''
                if (route.riskCategory === 'High') {
                  badgeColor = 'text-red-400 bg-red-950/20 border-red-900/30'
                } else if (route.riskCategory === 'Medium') {
                  badgeColor = 'text-amber-400 bg-amber-950/20 border-amber-900/30'
                } else {
                  badgeColor = 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30'
                }

                return (
                  <tr key={route.id} className="hover:bg-slate-900/40 transition-all">
                    <td className="py-3 px-1">
                      <p className="font-bold text-slate-300">{route.source}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">to {route.destination}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeColor}`}>
                        {route.riskCategory === 'High' && <AlertTriangle size={10} />}
                        {route.riskCategory === 'Medium' && <HelpCircle size={10} />}
                        {route.riskCategory === 'Low' && <CheckCircle size={10} />}
                        {route.riskCategory} Risk ({route.riskScore}%)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500">
                      {dateStr}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default memo(RouteIntelligence)
