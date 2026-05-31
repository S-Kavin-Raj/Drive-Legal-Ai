import React, { memo } from 'react'
import { Navigation, Clock, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react'

function JourneySummary({ route, loading }) {
  if (loading) {
    return (
      <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 space-y-4 animate-pulse">
        <div className="h-4 w-1/2 bg-slate-800 rounded" />
        <div className="h-10 bg-slate-800 rounded" />
        <div className="h-10 bg-slate-800 rounded" />
      </div>
    )
  }

  if (!route) {
    return (
      <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 text-center min-h-[140px] flex flex-col justify-center items-center">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">No Active Journey</p>
        <p className="text-[10px] text-slate-650 mt-1">Configure coordinates in the planner to map parameters.</p>
      </div>
    )
  }

  // Format Duration
  const hrs = Math.floor(route.durationMinutes / 60)
  const mins = route.durationMinutes % 60
  const durationStr = `${hrs > 0 ? `${hrs}h ` : ''}${mins}m`

  let statusBadge = ''
  if (route.riskCategory === 'High') {
    statusBadge = 'text-red-400 bg-red-950/20 border-red-900/30'
  } else if (route.riskCategory === 'Medium') {
    statusBadge = 'text-amber-400 bg-amber-950/20 border-amber-900/30'
  } else {
    statusBadge = 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30'
  }

  return (
    <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Journey Summary</span>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusBadge}`}>
          {route.riskCategory} Risk
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block">Planned Pathway</span>
          <p className="text-xs font-bold text-slate-350 truncate mt-0.5">{route.source} to {route.destination}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Distance */}
          <div className="p-2 rounded-xl bg-black/40 border border-slate-900 flex items-center gap-2">
            <Navigation className="text-sky-500" size={13} />
            <div>
              <span className="text-[8px] font-bold text-slate-600 uppercase block leading-none">Distance</span>
              <span className="text-xs font-extrabold text-slate-300 block mt-0.5">{route.distanceKm || 45} km</span>
            </div>
          </div>

          {/* Duration */}
          <div className="p-2 rounded-xl bg-black/40 border border-slate-900 flex items-center gap-2">
            <Clock className="text-indigo-500" size={13} />
            <div>
              <span className="text-[8px] font-bold text-slate-600 uppercase block leading-none">Duration</span>
              <span className="text-xs font-extrabold text-slate-300 block mt-0.5">{durationStr}</span>
            </div>
          </div>
        </div>

        {/* Risk Breakdown Slider */}
        <div className="p-3 rounded-xl bg-black/40 border border-slate-900">
          <div className="flex items-center justify-between text-[9px] font-bold text-slate-655">
            <span>Risk Index Score</span>
            <span className={route.riskScore > 65 ? 'text-red-500' : route.riskScore > 30 ? 'text-amber-500' : 'text-emerald-500'}>
              {route.riskScore}%
            </span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1 mt-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                route.riskScore > 65 ? 'bg-red-500' : route.riskScore > 30 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${route.riskScore}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(JourneySummary)
