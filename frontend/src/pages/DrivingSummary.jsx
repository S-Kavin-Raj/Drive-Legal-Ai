import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  CheckCircle2, Navigation, Clock, Gauge, AlertTriangle,
  ShieldCheck, Zap, ChevronRight, Activity, RefreshCw, MapPin
} from 'lucide-react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase/config'
import { calcSafetyScore } from '../services/trafficRuleEngine'

// ── Safety score color helper ────────────────────────────────────────────────
function scoreColor(score) {
  if (score >= 85) return '#22C55E'
  if (score >= 60) return '#F59E0B'
  return '#EF4444'
}

function scoreLabel(score) {
  if (score >= 85) return 'Excellent'
  if (score >= 60) return 'Fair'
  return 'Needs Improvement'
}

// ── Event type display config ────────────────────────────────────────────────
const EVENT_DISPLAY = {
  SPEED_WARNING:  { label: 'Speed Warning',   color: '#EF4444', icon: '⚡' },
  SCHOOL_ZONE:    { label: 'School Zone',     color: '#8900F2', icon: '🏫' },
  HOSPITAL_ZONE:  { label: 'Hospital Zone',   color: '#3B82F6', icon: '🏥' },
  ACCIDENT_ZONE:  { label: 'Accident Zone',   color: '#EF4444', icon: '⚠️' },
  OFF_ROUTE:      { label: 'Off Route',       color: '#F59E0B', icon: '🔄' },
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, unit, color = '#8900F2', accent = false }) {
  return (
    <div
      className="flex flex-col gap-1.5 px-4 py-4 rounded-2xl"
      style={{
        background: accent
          ? `linear-gradient(135deg, ${color}18, ${color}06)`
          : 'rgba(15,17,23,0.85)',
        border: `1px solid ${accent ? color + '35' : 'rgba(255,255,255,0.05)'}`,
      }}
    >
      <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
        <Icon size={14} style={{ color }} />
      </div>
      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="font-black text-xl leading-none text-slate-100">{value}</span>
        {unit && <span className="text-[9px] font-bold text-slate-500 uppercase">{unit}</span>}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
export default function DrivingSummary() {
  const navigate  = useNavigate()
  const location  = useLocation()

  // Pull session data passed from DrivingMode via navigate state
  const state = location.state || {}
  const {
    sessionId,
    source            = 'Start',
    destination       = 'Destination',
    duration          = 0,
    distanceTravelled = 0,
    averageSpeed      = 0,
    warningsCount     = 0,
    violationsCount   = 0,
    safetyScore: passedScore,
  } = state

  const safetyScore = passedScore ?? calcSafetyScore(warningsCount, violationsCount)

  // ── Event Timeline (Feature 6) ──────────────────────────────────────────
  const [events,        setEvents]       = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    setEventsLoading(true)

    async function loadEvents() {
      try {
        const q = query(
          collection(db, 'drivingSessions', sessionId, 'events'),
          orderBy('timestamp', 'asc')
        )
        const snap = await getDocs(q)
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (err) {
        console.warn('[DrivingSummary] Could not load events:', err.message)
        setEvents([])
      } finally {
        setEventsLoading(false)
      }
    }

    loadEvents()
  }, [sessionId])

  // Format MM:SS
  const mins = Math.floor(duration / 60)
  const secs = duration % 60
  const durationLabel = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  const color = scoreColor(safetyScore)

  return (
    <div
      className="min-h-[100dvh] pb-[100px] flex flex-col"
      style={{ background: 'var(--bg)' }}
    >
      {/* ── Top ambient glow ───────────────────────────── */}
      <div
        className="absolute top-0 left-0 right-0 h-[260px] pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${color}20 0%, transparent 70%)` }}
      />

      {/* ── Header ────────────────────────────────────── */}
      <div className="relative z-10 pt-14 px-5 pb-6 flex flex-col items-center gap-4 text-center">

        {/* Session Complete pill */}
        <div
          className="flex items-center gap-2 px-4 py-1.5 rounded-full"
          style={{ background: color + '18', border: `1px solid ${color}40` }}
        >
          <CheckCircle2 size={12} style={{ color }} />
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>
            Session Complete
          </span>
        </div>

        {/* Safety score ring */}
        <div className="relative w-28 h-28 flex items-center justify-center mt-2">
          <svg width="112" height="112" className="rotate-[-90deg]" viewBox="0 0 112 112">
            <circle cx="56" cy="56" r="46" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle
              cx="56" cy="56" r="46" fill="none"
              stroke={color} strokeWidth="8"
              strokeDasharray={`${(safetyScore / 100) * (2 * Math.PI * 46)} ${2 * Math.PI * 46}`}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: 'stroke-dasharray 1.2s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-black text-3xl leading-none" style={{ color }}>{safetyScore}</span>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Safety</span>
          </div>
        </div>

        {/* Score label */}
        <div>
          <h1 className="font-black text-xl text-slate-100">{scoreLabel(safetyScore)}</h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1.5">
            <MapPin size={10} />
            {source} → {destination}
          </p>
        </div>
      </div>

      {/* ── Stats Grid (Feature 7) ─────────────────────── */}
      <div className="px-5 grid grid-cols-2 gap-3">
        <StatCard icon={Clock}         label="Duration"      value={durationLabel} unit="mm:ss"  color="#8900F2" />
        <StatCard icon={Navigation}    label="Distance"      value={distanceTravelled.toFixed(1)} unit="km" color="#3B82F6" />
        <StatCard icon={Gauge}         label="Avg Speed"     value={averageSpeed}  unit="km/h"  color="#8900F2" />
        <StatCard icon={ShieldCheck}   label="Safety Score"  value={safetyScore}   unit="/100"  color={color} accent />
      </div>

      {/* ── Warning / Violation summary ────────────────── */}
      <div className="px-5 mt-4 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
             style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Warnings</p>
            <p className="font-black text-lg text-amber-400 leading-none mt-0.5">{warningsCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
             style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <Zap size={16} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Violations</p>
            <p className="font-black text-lg text-red-400 leading-none mt-0.5">{violationsCount}</p>
          </div>
        </div>
      </div>

      {/* ── Safety breakdown card ─────────────────────── */}
      <div className="px-5 mt-4">
        <div
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(13,22,38,0.95), rgba(8,13,23,0.95))',
            border: `1px solid ${color}30`,
            boxShadow: `0 8px 32px ${color}15`,
          }}
        >
          <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
               style={{ background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`, transform: 'translate(30%,-30%)' }} />

          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
              <Activity size={16} style={{ color }} />
            </div>
            <div>
              <h3 className="font-bold text-[13px] text-slate-200">Safety Breakdown</h3>
              <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">How your score was calculated</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Base score</span>
              <span className="font-black text-slate-200">100 pts</span>
            </div>
            {violationsCount > 0 && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-red-400">Violations (×{violationsCount} × 10)</span>
                <span className="font-black text-red-400">−{violationsCount * 10} pts</span>
              </div>
            )}
            {warningsCount > 0 && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-amber-400">Warnings (×{warningsCount} × 3)</span>
                <span className="font-black text-amber-400">−{warningsCount * 3} pts</span>
              </div>
            )}
            <div className="h-px bg-slate-900 my-1" />
            <div className="flex justify-between items-center text-[13px]">
              <span className="font-black text-slate-200">Final Score</span>
              <span className="font-black" style={{ color }}>{safetyScore} / 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Event Timeline (Feature 6) ─────────────────── */}
      <div className="px-5 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-[13px] text-slate-200">Drive Event Timeline</h3>
          {eventsLoading && <RefreshCw size={12} className="text-purple-500 animate-spin" />}
        </div>

        {eventsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-2xl animate-pulse"
                   style={{ background: 'rgba(137,0,242,0.06)', border: '1px solid rgba(137,0,242,0.10)' }} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-600">
            <CheckCircle2 size={28} className="text-slate-800" />
            <p className="text-[11px] font-bold uppercase tracking-widest">No Events Recorded</p>
            <p className="text-[10px] text-slate-700">Clean session — no alerts triggered.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((ev, idx) => {
              const cfg = EVENT_DISPLAY[ev.type] || { label: ev.type, color: '#667085', icon: '📍' }
              const timeStr = ev.timestamp
                ? new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
                : '--:--'

              return (
                <div
                  key={ev.id || idx}
                  className="flex items-start gap-3 px-4 py-3.5 rounded-2xl"
                  style={{ background: cfg.color + '0A', border: `1px solid ${cfg.color}25` }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-[14px]"
                    style={{ background: cfg.color + '18' }}
                  >
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: cfg.color }}>
                        {cfg.label}
                      </span>
                      <span className="text-[9px] font-bold text-slate-600 flex-shrink-0">{timeStr}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-relaxed">{ev.message}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── CTA buttons ───────────────────────────────── */}
      <div className="px-5 mt-6 flex flex-col gap-3">
        <button
          onClick={() => navigate('/plan-trip')}
          className="w-full py-4.5 rounded-3xl font-black text-[13px] tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-transform text-white"
          style={{
            background: 'linear-gradient(135deg, #8900F2 0%, #6B00C2 100%)',
            boxShadow: '0 4px 20px rgba(137,0,242,0.4)',
          }}
        >
          <Navigation size={15} />
          Plan New Trip
        </button>
        <button
          onClick={() => navigate('/dashboard', { replace: true })}
          className="w-full py-4 rounded-3xl font-black text-[12px] tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-transform text-slate-300 bg-slate-900/80 border border-slate-800"
        >
          Back to Home
          <ChevronRight size={14} className="text-slate-600" />
        </button>
      </div>
    </div>
  )
}
