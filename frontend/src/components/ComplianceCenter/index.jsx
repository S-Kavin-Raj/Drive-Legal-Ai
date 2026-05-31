import React, { memo } from 'react'
import { ShieldCheck, FileText, CheckCircle2, AlertCircle, XCircle, History, Clock3, TriangleAlert } from 'lucide-react'

function ComplianceCenter({ documents, readinessScore, status, issues = [], expiringSoon = [], complianceHistory = [], lastEvaluatedAt, loading }) {
  const docList = [
    { key: 'license', label: 'Driver License' },
    { key: 'rc', label: 'Registration (RC)' },
    { key: 'insurance', label: 'Insurance Policy' },
    { key: 'puc', label: 'Emission Cert (PUC)' },
  ]

  if (loading) {
    return (
      <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 space-y-4 animate-pulse">
        <div className="h-4 w-1/3 bg-slate-800 rounded" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 bg-slate-800 rounded" />
        ))}
      </div>
    )
  }

  return (
    <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Compliance Readiness</span>
          <span className="text-[10px] text-slate-500 mt-1 block">{lastEvaluatedAt ? `Last evaluated: ${new Date(lastEvaluatedAt).toLocaleString()}` : 'Evaluated from Firestore documents'}</span>
        </div>
        <span className={`text-[10px] font-extrabold ${status === 'Ready' ? 'text-emerald-400' : 'text-red-400'}`}>
          {status || 'Not Ready'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            readinessScore === 100 ? 'bg-emerald-500' : readinessScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${readinessScore}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>{readinessScore}% readiness score</span>
        <span className={`font-semibold ${status === 'Ready' ? 'text-emerald-400' : 'text-red-400'}`}>{status || 'Not Ready'}</span>
      </div>

      {/* Document vaulted list */}
      <div className="space-y-2">
        {docList.map((docItem) => {
          const status = documents[docItem.key] || 'Missing'
          
          let badgeColor = ''
          let Icon = XCircle

          if (status === 'Valid') {
            badgeColor = 'text-emerald-400'
            Icon = CheckCircle2
          } else if (status === 'Expired') {
            badgeColor = 'text-red-400'
            Icon = AlertCircle
          } else {
            badgeColor = 'text-slate-600'
            Icon = XCircle
          }

          return (
            <div key={docItem.key} className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-slate-900/50 text-[11px]">
              <div className="flex items-center gap-2">
                <FileText size={12} className="text-slate-500" />
                <span className="font-semibold text-slate-400">{docItem.label}</span>
              </div>

              <span className={`inline-flex items-center gap-1 font-bold uppercase text-[9px] ${badgeColor}`}>
                <Icon size={11} />
                {status}
              </span>
            </div>
          )
        })}
      </div>

      {/* Issues and expirations */}
      {(issues.length > 0 || expiringSoon.length > 0) && (
        <div className="space-y-3 pt-2 border-t border-slate-900">
          {issues.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
                <TriangleAlert size={13} />
                Issues
              </div>
              {issues.map((issue, index) => (
                <div key={`${issue.type}-${index}`} className="rounded-xl border border-red-900/30 bg-red-950/20 p-3 text-[11px] text-red-200">
                  <p className="font-semibold">{issue.type?.toUpperCase() || 'DOCUMENT'}</p>
                  <p className="text-red-300/90 mt-1">{issue.message}</p>
                </div>
              ))}
            </div>
          )}

          {expiringSoon.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Clock3 size={13} />
                Expiring Soon
              </div>
              {expiringSoon.map((docItem) => (
                <div key={`${docItem.type}-${docItem.daysRemaining}`} className="rounded-xl border border-amber-900/30 bg-amber-950/20 p-3 text-[11px] text-amber-200 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{docItem.type?.toUpperCase()}</p>
                    <p className="text-amber-300/80 mt-1">Expires in {docItem.daysRemaining} day(s)</p>
                  </div>
                  <History size={13} className="text-amber-300" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent history */}
      {complianceHistory.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-900">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <History size={13} />
            Recent Compliance History
          </div>
          <div className="space-y-2 max-h-44 overflow-auto pr-1">
            {complianceHistory.slice(0, 3).map((entry) => (
              <div key={entry.id} className="rounded-xl border border-slate-900 bg-black/30 p-3 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-200">{entry.status || 'Not Ready'}</p>
                  <p className="text-slate-500">{typeof entry.readinessScore === 'number' ? `${entry.readinessScore}%` : '—'}</p>
                </div>
                <p className="text-slate-500 mt-1">{entry.evaluatedAt?.toDate ? entry.evaluatedAt.toDate().toLocaleString() : entry.evaluatedAt ? new Date(entry.evaluatedAt).toLocaleString() : 'Recently evaluated'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(ComplianceCenter)
