import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'
import { useCompliance } from '../hooks/useCompliance'
import { useChallans } from '../hooks/useChallans'
import { useRouteAnalysis } from '../hooks/useRouteAnalysis'
import { useLastSession } from '../hooks/useLastSession'
import { calcSafetyScore } from '../services/trafficRuleEngine'
import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Navigation, Shield, ChevronRight, AlertCircle, RefreshCw, Zap, ShieldCheck, AlertTriangle, X, Upload, FileText, Compass, Bell, Activity
} from 'lucide-react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import toast from 'react-hot-toast'
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  sweepNotifications
} from '../services/notificationService'

const VEHICLE_DOCS = {
  bike: ['license', 'insurance', 'puc'],
  car: ['license', 'rc', 'insurance', 'puc'],
  commercial: ['license', 'rc', 'insurance', 'puc', 'fc']
}

/* Safe accessors — avoids bracket-notation lint on Firestore values */
function getVehicleEmoji(type) {
  if (type === 'bike') return '🏍️'
  if (type === 'commercial') return '🚛'
  return '🚗'
}

function getVehicleLabel(type) {
  if (type === 'bike') return 'Bike'
  if (type === 'commercial') return 'Commercial'
  return 'Car'
}

const DEFAULT_CENTER = [11.0168, 76.9558]

/* ─── Skeleton ──────────────────────────────────────── */
function Skeleton({ className = '' }) {
  return (
    <div
      className={`rounded-3xl animate-pulse ${className}`}
      style={{ background: 'rgba(137,0,242,0.06)', border: '1px solid rgba(137,0,242,0.10)' }}
    />
  )
}

/* ─── Error ─────────────────────────────────────────── */
function ProfileError({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-5 text-center px-6"
         style={{ background: 'var(--bg)' }}>
      <AlertCircle size={44} style={{ color: '#EF4444' }} />
      <div>
        <p className="font-bold text-lg" style={{ color: 'var(--text)' }}>Profile Unavailable</p>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Could not load your driver profile.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm active:scale-95 transition-transform"
        style={{ background: 'rgba(137,0,242,0.15)', border: '1px solid rgba(137,0,242,0.35)', color: '#8900F2' }}
      >
        <RefreshCw size={15} /> Retry
      </button>
    </div>
  )
}

/* ─── Compliance Ring ───────────────────────────────── */
function ComplianceRing({ score, status }) {
  const r = 28, circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = status === 'Ready' ? '#22C55E' : status === 'Partial' ? '#F59E0B' : '#EF4444'

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg width="80" height="80" className="rotate-[-90deg]" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
        <circle
          cx="40" cy="40" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-black text-[16px] leading-none" style={{ color }}>{score}%</span>
        <span className="text-[9px] font-semibold mt-0.5" style={{ color: 'var(--muted)' }}>SCORE</span>
      </div>
    </div>
  )
}

/* ─── Dashboard ─────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, loading: pLoad, error, refetch } = useUserProfile()
  const { documents: liveDocs, readinessScore: complianceScoreVal, loading: cLoad } = useCompliance()
  const { challans = [] } = useChallans()
  const { routes = [] } = useRouteAnalysis()
  const { session: lastSession, loading: sessionLoad } = useLastSession()
  const recentRoute = routes[0]
  const complianceScore = complianceScoreVal ?? 0
  const complianceStatus = complianceScore === 100 ? 'Ready' : complianceScore > 0 ? 'Partial' : 'Not Ready'

  const activeChallans = challans.filter(c => c.status !== 'Paid')
  const totalFineAmount = activeChallans.reduce((acc, c) => acc + (Number(c.fineAmount) || 0), 0)
  const dueSoonCount = activeChallans.filter(c => c.status === 'Due Soon').length
  const overdueCount = activeChallans.filter(c => c.status === 'Overdue').length

  const [showPreDriveModal, setShowPreDriveModal] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [missingDocs, setMissingDocs] = useState([])
  const [expiredDocs, setExpiredDocs] = useState([])
  const [loggingHistory, setLoggingHistory] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false)
  const [activeTab, setActiveTab] = useState('All')
  const [loadingNotifications, setLoadingNotifications] = useState(true)

  // Trust score states (Step 9)
  const [trustScore, setTrustScore] = useState(null)
  const [loadingTrust, setLoadingTrust] = useState(true)

  const notificationsEnabled = profile?.settings?.notificationsEnabled !== false

  useEffect(() => {
    if (!user?.uid) return

    async function initNotifications() {
      setLoadingNotifications(true)
      setLoadingTrust(true)
      try {
        await sweepNotifications(user.uid)
      } catch (e) {
        console.warn('[Dashboard] Notification sweep failed:', e.message)
      }
      try {
        const res = await fetchNotifications(user.uid)
        setNotifications(res.notifications || [])
      } catch (e) {
        console.error('[Dashboard] Failed to fetch notifications:', e)
      } finally {
        setLoadingNotifications(false)
      }

      // Fetch driver trust score
      try {
        const { fetchTrustScore } = await import('../services/trustScoreService')
        const scoreData = await fetchTrustScore(user.uid)
        setTrustScore(scoreData)
      } catch (e) {
        console.error('[Dashboard] Failed to fetch trust score:', e)
      } finally {
        setLoadingTrust(false)
      }
    }

    initNotifications()
  }, [user?.uid])

  async function handleMarkAsRead(id) {
    try {
      await markAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch (e) {
      toast.error('Failed to mark notification as read')
    }
  }

  async function handleMarkAllAsRead() {
    if (!user?.uid) return
    try {
      await markAllAsRead(user.uid)
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      toast.success('All notifications marked as read')
    } catch (e) {
      toast.error('Failed to mark all notifications as read')
    }
  }

  async function logReadinessHistory(score, status) {
    if (!user?.uid) return
    try {
      await addDoc(collection(db, 'readinessHistory'), {
        userId: user.uid,
        score,
        status,
        createdAt: serverTimestamp()
      })
      console.log('[Dashboard] Logged driving readiness history successfully')
    } catch (err) {
      console.error('[Dashboard] Failed to log readiness history:', err)
    }
  }

  function handleStartDrivingClick() {
    if (!liveDocs) {
      toast.error('Syncing your compliance profile, please wait...')
      return
    }

    const vehicleType = profile?.vehicleType || 'car'
    const requiredTypes = VEHICLE_DOCS[vehicleType] || VEHICLE_DOCS.car
    const missing = []
    const expired = []

    requiredTypes.forEach((type) => {
      const status = liveDocs[type] || 'Missing'
      if (status === 'Missing') missing.push(type)
      if (status === 'Expired') expired.push(type)
    })

    setMissingDocs(missing)
    setExpiredDocs(expired)

    // Check critical blocker: License or Insurance missing/expired
    const isLicenseCrit = missing.includes('license') || expired.includes('license')
    const isInsuranceCrit = missing.includes('insurance') || expired.includes('insurance')
    const blocked = isLicenseCrit || isInsuranceCrit

    setIsBlocked(blocked)
    setShowPreDriveModal(true)
  }

  const loading = pLoad || cLoad
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'
  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Driver'

  if (error) return <ProfileError onRetry={refetch} />

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Full-screen map ─────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={DEFAULT_CENTER} zoom={14}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false} attributionControl={false}
          dragging={false} touchZoom={false} scrollWheelZoom={false}
          doubleClickZoom={false} keyboard={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        </MapContainer>
        {/* Dim overlay */}
        <div className="absolute inset-0" style={{ background: 'rgba(8,9,13,0.45)' }} />
        {/* Purple ambient glow */}
        <div className="absolute bottom-0 left-0 right-0 h-[65%] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 120%, rgba(137,0,242,0.18) 0%, transparent 70%)' }} />
      </div>

      {/* ── Top greeting ────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-10 pt-14 px-5 map-gradient-top pb-8 pointer-events-none">
        <div className="slide-up">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase"
             style={{ color: '#8900F2', textShadow: '0 0 16px rgba(137,0,242,0.7)' }}>
            DriveLegal AI
          </p>
          <h1 className="font-black text-[28px] leading-tight mt-1" style={{ color: 'var(--text)' }}>
            Good {greeting},<br/>
            <span style={{ color: 'var(--text)' }}>{firstName} 👋</span>
          </h1>
        </div>
      </div>

      {/* ── Notification Bell ────────────────────────── */}
      <div className="absolute top-14 right-5 z-20 pointer-events-auto">
        <button
          onClick={() => setShowNotificationDrawer(true)}
          className="w-10 h-10 rounded-2xl flex items-center justify-center relative active:scale-90 transition-transform cursor-pointer"
          style={{ 
            background: 'rgba(13,26,38,0.75)', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          <Bell size={18} style={{ color: '#E2E8F0' }} />
          {notificationsEnabled && notifications.filter(n => !n.isRead).length > 0 && (
            <span 
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white bg-red-500 animate-pulse border border-[#08090D]"
              style={{ boxShadow: '0 0 8px rgba(239,68,68,0.6)' }}
            >
              {notifications.filter(n => !n.isRead).length}
            </span>
          )}
        </button>
      </div>

      {/* ── Bottom sheet ────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 glass-strong sheet-shadow slide-up rounded-t-[32px] pb-[80px]"
        style={{ paddingTop: '20px' }}
      >
        {/* Pull handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(137,0,242,0.35)' }} />
        </div>

        <div className="px-5 space-y-4">

          {/* Vehicle + Compliance row */}
          {loading ? (
            <div className="flex gap-3">
              <Skeleton className="h-[100px] flex-1" />
              <Skeleton className="h-[100px] w-[100px]" />
            </div>
          ) : (
            <div className="flex gap-3 items-stretch">
              {/* Vehicle card */}
              <div
                className="flex-1 rounded-3xl p-4 flex flex-col justify-between"
                style={{ background: 'rgba(137,0,242,0.10)', border: '1px solid rgba(137,0,242,0.22)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getVehicleEmoji(profile?.vehicleType)}</span>
                  <div>
                    <p className="font-bold text-[14px]" style={{ color: 'var(--text)' }}>
                      {getVehicleLabel(profile?.vehicleType)}
                    </p>
                    <p className="text-[11px] font-medium" style={{ color: 'var(--muted)' }}>Vehicle</p>
                  </div>
                </div>
                <div
                  className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-xl w-fit"
                  style={{
                    background: complianceStatus === 'Ready' ? 'rgba(34,197,94,0.12)' :
                                complianceStatus === 'Partial' ? 'rgba(245,158,11,0.12)' :
                                'rgba(239,68,68,0.12)',
                    border: `1px solid ${complianceStatus === 'Ready' ? 'rgba(34,197,94,0.3)' :
                                         complianceStatus === 'Partial' ? 'rgba(245,158,11,0.3)' :
                                         'rgba(239,68,68,0.3)'}`,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full pulse-dot"
                    style={{ background: complianceStatus === 'Ready' ? '#22C55E' :
                                          complianceStatus === 'Partial' ? '#F59E0B' : '#EF4444' }}
                  />
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: complianceStatus === 'Ready' ? '#22C55E' :
                                    complianceStatus === 'Partial' ? '#F59E0B' : '#EF4444' }}
                  >
                    {complianceStatus ?? 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Compliance ring */}
              <div
                className="rounded-3xl p-3 flex flex-col items-center justify-center gap-1"
                style={{ background: 'rgba(137,0,242,0.10)', border: '1px solid rgba(137,0,242,0.22)', width: '100px' }}
              >
                <ComplianceRing score={complianceScore} status={complianceStatus} />
                <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                  COMPLIANCE
                </p>
              </div>
            </div>
          )}

          {/* Driving Readiness Card */}
          <div
            className="rounded-3xl p-5 relative overflow-hidden flex flex-col gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(22,27,38,0.95), rgba(15,17,23,0.95))',
              border: `1px solid ${
                complianceScore === 100 ? 'rgba(34,197,94,0.25)' :
                complianceScore >= 70 ? 'rgba(245,158,11,0.25)' :
                'rgba(239,68,68,0.25)'
              }`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {/* Header / Title */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    background: 
                      complianceScore === 100 ? 'rgba(34,197,94,0.15)' :
                      complianceScore >= 70 ? 'rgba(245,158,11,0.15)' :
                      'rgba(239,68,68,0.15)'
                  }}
                >
                  <Shield 
                    size={16} 
                    style={{ 
                      color: 
                        complianceScore === 100 ? '#22C55E' :
                        complianceScore >= 70 ? '#F59E0B' :
                        '#EF4444' 
                    }} 
                  />
                </div>
                <div>
                  <h3 className="font-bold text-[13px] text-slate-200">Driving Readiness</h3>
                  <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5">Live Compliance Index</p>
                </div>
              </div>

              {/* Score Indicator */}
              <div className="flex flex-col items-end">
                <span 
                  className="font-black text-xl leading-none"
                  style={{ 
                    color: 
                      complianceScore === 100 ? '#22C55E' :
                      complianceScore >= 70 ? '#F59E0B' :
                      '#EF4444',
                    textShadow: `0 0 10px ${
                      complianceScore === 100 ? 'rgba(34,197,94,0.3)' :
                      complianceScore >= 70 ? 'rgba(245,158,11,0.3)' :
                      'rgba(239,68,68,0.3)'
                    }`
                  }}
                >
                  {complianceScore}%
                </span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">SCORE</span>
              </div>
            </div>

            {/* Status Info bar */}
            <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-900/60">
              <span className="text-[11px] text-slate-400 font-semibold">Current Driving Status:</span>
              <span 
                className="text-[11px] font-black uppercase tracking-wider"
                style={{ 
                  color: 
                    complianceScore === 100 ? '#22C55E' :
                    complianceScore >= 70 ? '#F59E0B' :
                    '#EF4444' 
                }}
              >
                {complianceScore === 100 ? 'Ready To Drive' : complianceScore >= 70 ? 'Drive With Caution' : 'Not Ready'}
              </span>
            </div>
          </div>

          {/* Latest Alert Ticker Banner */}
          {notificationsEnabled && notifications.filter(n => !n.isRead).length > 0 && (
            <div 
              onClick={() => setShowNotificationDrawer(true)}
              className="rounded-2xl p-3 flex items-center gap-3 animate-pulse cursor-pointer border border-[#EF4444]/20 active:scale-[0.99] transition-transform"
              style={{
                background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))',
                boxShadow: '0 4px 16px rgba(239,68,68,0.05)'
              }}
            >
              <AlertTriangle size={15} className="text-red-400 flex-shrink-0 animate-bounce" />
              <div className="text-left flex-1 min-w-0">
                <p className="text-[9px] font-black tracking-widest text-red-400 uppercase">Latest Warning Alert</p>
                <p className="text-[11px] text-slate-350 font-bold truncate mt-0.5">
                  {notifications.filter(n => !n.isRead)[0].message}
                </p>
              </div>
              <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />
            </div>
          )}

          {/* Driver Trust Score Card (Phase 11 — 300–900 Scale) */}
          {loadingTrust ? (
            <Skeleton className="h-[180px] w-full" />
          ) : trustScore && (
            <div
              className="rounded-3xl p-5 relative overflow-hidden flex flex-col gap-4 text-left"
              style={{
                background: 'linear-gradient(135deg, rgba(13,22,38,0.95), rgba(8,13,23,0.95))',
                border: '1px solid rgba(137,0,242,0.25)',
                boxShadow: '0 8px 32px rgba(137,0,242,0.15)',
              }}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-500/15 text-[#8900F2]">
                    <Zap size={16} fill="currentColor" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[13px] text-slate-200">Driver Trust Score</h3>
                    <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5">300–900 Range</p>
                  </div>
                </div>

                {/* Score + Grade */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span 
                      className="font-black text-2xl leading-none"
                      style={{ 
                        color: (trustScore.trustScore || trustScore.score) >= 700 ? '#22C55E' : 
                               (trustScore.trustScore || trustScore.score) >= 500 ? '#F59E0B' : '#EF4444',
                        textShadow: '0 0 10px rgba(137,0,242,0.5)' 
                      }}
                    >
                      {trustScore.trustScore || trustScore.score || 300}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-widest mt-0.5"
                      style={{ 
                        color: (trustScore.trustScore || trustScore.score) >= 700 ? '#22C55E' : 
                               (trustScore.trustScore || trustScore.score) >= 500 ? '#F59E0B' : '#EF4444'
                      }}
                    >{trustScore.grade || 'Calculating'}</span>
                  </div>
                </div>
              </div>

              {/* Risk Level + Trend */}
              <div className="flex items-center justify-between bg-slate-950/60 border border-white/5 rounded-2xl p-3">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Assigned Tier</span>
                  <span 
                    className="font-black text-[13px] mt-0.5 block tracking-wide uppercase"
                    style={{
                      color: 
                        trustScore.level === 'Elite Driver' ? '#D6BBFC' :
                        trustScore.level === 'Safe Driver' ? '#22C55E' :
                        trustScore.level === 'Average Driver' ? '#F59E0B' :
                        '#EF4444'
                    }}
                  >
                    👑 {trustScore.level}
                  </span>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  {trustScore.change != null && trustScore.change !== 0 && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                      trustScore.change > 0 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {trustScore.change > 0 ? '▲' : '▼'} {Math.abs(trustScore.change)} pts
                    </span>
                  )}
                  <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Active Profile
                  </span>
                </div>
              </div>

              {/* ── Trust Breakdown Bars ──────────────────────────── */}
              {(trustScore.complianceScore || trustScore.breakdown) && (
                <div className="space-y-2.5 border-t border-slate-900/60 pt-3.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block text-left">Score Breakdown</span>
                  {[
                    { label: 'Compliance',  value: trustScore.complianceScore,  weight: '25%', color: '#3B82F6' },
                    { label: 'Driving',     value: trustScore.drivingScore,     weight: '35%', color: '#8B5CF6' },
                    { label: 'Challans',    value: trustScore.challanScore,     weight: '25%', color: '#F59E0B' },
                    { label: 'Consistency', value: trustScore.consistencyScore, weight: '15%', color: '#22C55E' },
                  ].map((item) => {
                    const score = item.value || 300
                    const pct = Math.round(((score - 300) / 600) * 100)
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400">{item.label} <span className="text-slate-600">({item.weight})</span></span>
                          <span className="text-[10px] font-black" style={{ color: item.color }}>{score}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${pct}%`, background: item.color, boxShadow: `0 0 8px ${item.color}40` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Explainability Factors */}
              <div className="space-y-2 border-t border-slate-900/60 pt-3.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block text-left">Primary Score Factors</span>
                <div className="space-y-1.5">
                  {trustScore.factors?.positive?.map((f, i) => (
                    <div key={`pos-${i}`} className="flex items-start gap-2 text-[11px] text-slate-300">
                      <span className="text-emerald-400 font-bold flex-shrink-0">✓</span>
                      <span className="leading-tight">{f}</span>
                    </div>
                  ))}
                  {trustScore.factors?.negative?.map((f, i) => (
                    <div key={`neg-${i}`} className="flex items-start gap-2 text-[11px] text-slate-400">
                      <span className="text-red-400 font-bold flex-shrink-0">⚠</span>
                      <span className="leading-tight">{f}</span>
                    </div>
                  ))}
                  {(!trustScore.factors?.positive?.length && !trustScore.factors?.negative?.length) && (
                    <p className="text-[10px] text-slate-500 italic">No score factors recorded.</p>
                  )}
                </div>
              </div>

              {/* Dynamic Achievements Section */}
              {trustScore.achievements?.length > 0 && (
                <div className="border-t border-slate-900/60 pt-3.5 space-y-2">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block text-left">Earned Badges</span>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
                    {trustScore.achievements.map((ach) => (
                      <div 
                        key={ach.id} 
                        className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/5 border border-purple-500/15 text-[10px] font-bold text-purple-350"
                        title={ach.description}
                      >
                        <span>🎖️</span>
                        <span className="capitalize">{ach.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Improve My Score Button */}
              <div className="border-t border-slate-900/60 pt-3.5 mt-1">
                <button
                  onClick={() => navigate('/traffic-assistant-chat', { state: { prefilledQuestion: 'How do I improve my score?' } })}
                  className="w-full py-3 rounded-2xl text-[12px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-[0.98] border border-[#8900F2]/30 text-white bg-[#8900F2]/10 hover:bg-[#8900F2]/20 active:bg-[#8900F2]/30 shadow-[0_0_15px_rgba(137,0,242,0.15)]"
                >
                  <Zap size={14} className="text-[#8900F2]" fill="currentColor" />
                  Improve My Score
                </button>
              </div>
            </div>
          )}

          {/* Last Driving Session Card (Feature 8) */}
          {sessionLoad ? (
            <Skeleton className="h-[120px] w-full" />
          ) : lastSession ? (() => {
            const lsSafety = lastSession.safetyScore ??
              calcSafetyScore(lastSession.warningsCount || 0, lastSession.violationsCount || 0)
            const lsColor  = lsSafety >= 85 ? '#22C55E' : lsSafety >= 60 ? '#F59E0B' : '#EF4444'
            return (
              <div
                onClick={() => navigate('/driving-summary', {
                  state: {
                    sessionId:         lastSession.id,
                    source:            lastSession.source,
                    destination:       lastSession.destination,
                    duration:          lastSession.duration      || 0,
                    distanceTravelled: lastSession.distanceTravelled || 0,
                    averageSpeed:      lastSession.averageSpeed   || 0,
                    warningsCount:     lastSession.warningsCount  || 0,
                    violationsCount:   lastSession.violationsCount || 0,
                    safetyScore:       lsSafety,
                  }
                })}
                className="w-full rounded-3xl p-5 text-left active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(22,27,38,0.95), rgba(8,11,18,0.95))',
                  border: `1px solid ${lsColor}30`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
              >
                <div className="absolute top-0 right-0 w-28 h-28 pointer-events-none"
                     style={{ background: `radial-gradient(circle, ${lsColor}10 0%, transparent 70%)`, transform: 'translate(30%,-30%)' }} />

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: lsColor + '20' }}>
                      <Activity size={16} style={{ color: lsColor }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[13px] text-slate-200">Last Session</h3>
                      <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5">
                        {lastSession.source} → {lastSession.destination}
                      </p>
                    </div>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider"
                    style={{ background: lsColor + '18', color: lsColor, border: `1px solid ${lsColor}30` }}
                  >
                    {lsSafety}/100
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-900/60">
                  <div>
                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">Distance</p>
                    <p className="font-black text-[13px] text-slate-200 mt-0.5">{(lastSession.distanceTravelled || 0).toFixed(1)} <span className="text-[9px] text-slate-500">km</span></p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">Warnings</p>
                    <p className="font-black text-[13px] text-amber-400 mt-0.5">{lastSession.warningsCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">Violations</p>
                    <p className="font-black text-[13px] text-red-400 mt-0.5">{lastSession.violationsCount || 0}</p>
                  </div>
                </div>
              </div>
            )
          })() : null}

          {/* Plan Trip button */}
          <button
            onClick={() => navigate('/plan-trip')}
            className="w-full flex items-center justify-between px-5 py-4 rounded-3xl active:scale-[0.98] transition-transform"
            style={{ background: 'rgba(137,0,242,0.12)', border: '1px solid rgba(137,0,242,0.28)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
                   style={{ background: 'rgba(137,0,242,0.25)' }}>
                <Navigation size={18} style={{ color: '#8900F2' }} />
              </div>
              <div className="text-left">
                <p className="font-bold text-[14px]" style={{ color: 'var(--text)' }}>Plan a Trip</p>
                <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Analyse route risks</p>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: '#8900F2' }} />
          </button>

          {/* Document Vault CTA Card */}
          <button
            onClick={() => navigate('/document-vault')}
            className="w-full flex items-center justify-between px-5 py-4 rounded-3xl active:scale-[0.98] transition-transform"
            style={{ background: 'rgba(137,0,242,0.12)', border: '1px solid rgba(137,0,242,0.28)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
                   style={{ background: 'rgba(137,0,242,0.25)' }}>
                 <Shield size={18} style={{ color: '#8900F2' }} />
              </div>
              <div className="text-left">
                <p className="font-bold text-[14px]" style={{ color: 'var(--text)' }}>Document Vault</p>
                <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Manage legal credentials & expiry</p>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: '#8900F2' }} />
          </button>

          {/* Challan Overview Card (Dashboard Integration) */}
          <div
            onClick={() => navigate('/challan-manager')}
            className="w-full rounded-3xl p-5 text-left active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(26,5,51,0.95), rgba(15,2,34,0.95))',
              border: `1px solid ${overdueCount > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(137,0,242,0.25)'}`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
                 style={{ background: `radial-gradient(circle, ${overdueCount > 0 ? '#EF4444' : '#8900F2'}08 0%, transparent 70%)`, transform: 'translate(30%,-30%)' }} />

            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    background: overdueCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(137,0,242,0.15)'
                  }}
                >
                  <FileText 
                    size={16} 
                    style={{ 
                      color: overdueCount > 0 ? '#EF4444' : '#8900F2'
                    }} 
                  />
                </div>
                <div>
                  <h3 className="font-bold text-[13px] text-slate-200">Traffic Challans</h3>
                  <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5">Citation Tracker</p>
                </div>
              </div>

              {/* Counter Badge */}
              {activeChallans.length > 0 ? (
                <span 
                  className="px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider uppercase"
                  style={{
                    background: overdueCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                    color: overdueCount > 0 ? '#EF4444' : '#F59E0B',
                    border: `1px solid ${overdueCount > 0 ? '#EF4444' : '#F59E0B'}30`
                  }}
                >
                  {activeChallans.length} UNPAID
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider uppercase bg-green-500/10 text-green-500 border border-green-500/20">
                  CLEAN RECORD
                </span>
              )}
            </div>

            {/* Fine sum and breakdown */}
            <div className="flex items-end justify-between pt-2.5 border-t border-slate-900/60">
              <div>
                <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Unpaid Dues</p>
                <p className="font-black text-xl text-slate-200 mt-0.5">
                  ₹{totalFineAmount.toLocaleString('en-IN')}
                </p>
              </div>
              
              <div className="flex gap-2 text-right">
                {overdueCount > 0 && (
                  <div className="px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-wider">
                    {overdueCount} Overdue
                  </div>
                )}
                {dueSoonCount > 0 && (
                  <div className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-wider">
                    {dueSoonCount} Due Soon
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Route Intelligence Summary Card (Dashboard Integration - Step 9) */}
          <div
            onClick={() => navigate('/plan-trip')}
            className="w-full rounded-3xl p-5 text-left active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(22,27,38,0.95), rgba(8,11,18,0.95))',
              border: `1px solid ${recentRoute?.riskCategory === 'High' ? 'rgba(239,68,68,0.25)' : 'rgba(137,0,242,0.25)'}`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
                 style={{ background: `radial-gradient(circle, ${recentRoute?.riskCategory === 'High' ? '#EF4444' : '#8900F2'}08 0%, transparent 70%)`, transform: 'translate(30%,-30%)' }} />

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-500/15"
                >
                  <Compass size={16} className="text-[#8900F2]" />
                </div>
                <div>
                  <h3 className="font-bold text-[13px] text-slate-200">Route Intelligence</h3>
                  <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5">Spatial Risk Registry</p>
                </div>
              </div>

              {recentRoute ? (
                <span 
                  className="px-2 py-0.5 rounded-lg text-[8px] font-black tracking-wider uppercase"
                  style={{
                    background: recentRoute.riskCategory === 'High' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                    color: recentRoute.riskCategory === 'High' ? '#EF4444' : '#F59E0B',
                    border: `1px solid ${recentRoute.riskCategory === 'High' ? '#EF4444' : '#F59E0B'}30`
                  }}
                >
                  LATEST: {recentRoute.riskCategory} RISK
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-lg text-[8px] font-black tracking-wider uppercase bg-green-500/10 text-green-500 border border-green-500/20">
                  NO TRIP LOGS
                </span>
              )}
            </div>

            {recentRoute ? (
              <div className="space-y-2.5 pt-2 border-t border-slate-900/60">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">Latest Scanned Journey:</span>
                  <span className="text-slate-200 font-black truncate max-w-[180px]">{recentRoute.source} ➔ {recentRoute.destination}</span>
                </div>
                
                {/* School, Hospital and Accident tallies along the recent journey */}
                <div className="flex justify-between items-center text-[10px] bg-slate-950/65 border border-slate-900 rounded-xl p-2">
                  <div className="flex gap-4">
                    <span className="text-slate-400 font-medium">🏫 Schools: <strong className="text-slate-200">{recentRoute.routeIntelligence?.nearbySchools?.length || 0}</strong></span>
                    <span className="text-slate-400 font-medium">🏥 Hospitals: <strong className="text-slate-200">{recentRoute.routeIntelligence?.nearbyHospitals?.length || 0}</strong></span>
                    <span className="text-slate-400 font-medium">⚠️ Accidents: <strong className="text-red-400">{recentRoute.routeIntelligence?.nearbyAccidents?.length || 0}</strong></span>
                  </div>
                  <ChevronRight size={12} className="text-slate-500" />
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 leading-normal pt-2 border-t border-slate-900/60">
                No recent routes scanned. Plan a trip to extract hazard locations, speed zones, and accident prone points along your coordinates.
              </p>
            )}
          </div>

          {/* Start Driving CTA */}
          <button
            onClick={handleStartDrivingClick}
            className="w-full py-[18px] rounded-3xl font-black text-[16px] tracking-wide active:scale-[0.97] transition-transform"
            style={{
              background: 'linear-gradient(135deg, #8900F2 0%, #6B00C2 100%)',
              boxShadow: '0 4px 24px rgba(137,0,242,0.55), 0 0 60px rgba(137,0,242,0.15)',
              color: '#FFFFFF',
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <Zap size={20} strokeWidth={2.5} />
              START DRIVING
            </div>
          </button>

          {/* Document quick glance (Actual Live Vault Data) */}
          {!loading && liveDocs && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 w-full">
              {Object.entries(liveDocs).map(([key, status]) => {
                const isValid = status === 'Valid'
                const isExpiring = status === 'Expiring Soon'
                const isExpired = status === 'Expired'
                const color = isValid ? '#22C55E' : isExpiring ? '#F59E0B' : isExpired ? '#EF4444' : '#667085'
                
                return (
                  <button
                    key={key}
                    onClick={() => navigate('/document-vault')}
                    className="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-2xl text-left border transition-transform active:scale-95 select-none cursor-pointer"
                    style={{
                      background: `${color}08`,
                      borderColor: `${color}25`,
                      minWidth: '82px',
                    }}
                  >
                    <span className="text-[15px]">{isValid ? '✅' : isExpiring ? '⚠️' : isExpired ? '❌' : '📁'}</span>
                    <span className="text-[9px] font-semibold text-center capitalize leading-tight mt-0.5"
                          style={{ color: 'var(--text)' }}>
                      {key.toUpperCase()}
                    </span>
                    <span className="text-[8px] font-bold text-center uppercase tracking-wider mt-0.5"
                          style={{ color }}>
                      {status}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

        </div>
      </div>

      {/* ── Pre-Drive Compliance Modal ──────────────── */}
      {showPreDriveModal && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          {/* Modal content sheet */}
          <div className="w-full glass-strong rounded-t-[32px] p-6 pb-10 space-y-5 slide-up max-w-[440px] mx-auto border-t border-purple-500/20 shadow-2xl">
            {/* Handle bar */}
            <div className="flex justify-center -mt-2">
              <div className="w-10 h-1 rounded-full bg-slate-800" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-900/60">
              <div>
                <h2 className="font-black text-[16px] text-slate-200">Driving Readiness Check</h2>
                <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5">Pre-Drive Safety Scan</p>
              </div>
              <button
                onClick={() => setShowPreDriveModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-900 border border-slate-800 active:scale-90 transition-transform"
              >
                <X size={14} className="text-slate-400" />
              </button>
            </div>

            {/* Score & Status circle block */}
            <div className="flex flex-col items-center justify-center text-center p-4 rounded-3xl bg-purple-500/5 border border-purple-500/12">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Calculated Readiness</span>
              <span 
                className="font-black text-4xl mt-1 leading-none"
                style={{ 
                  color: isBlocked ? '#EF4444' : complianceScore === 100 ? '#22C55E' : '#F59E0B',
                  textShadow: `0 0 15px ${isBlocked ? 'rgba(239,68,68,0.4)' : complianceScore === 100 ? 'rgba(34,197,94,0.4)' : 'rgba(245,158,11,0.4)'}`
                }}
              >
                {complianceScore}%
              </span>
              <span 
                className="text-[11px] font-black uppercase tracking-wider mt-2.5 px-3 py-1 rounded-xl"
                style={{
                  background: `${isBlocked ? '#EF4444' : complianceScore === 100 ? '#22C55E' : '#F59E0B'}15`,
                  color: isBlocked ? '#EF4444' : complianceScore === 100 ? '#22C55E' : '#F59E0B',
                  border: `1px solid ${isBlocked ? '#EF4444' : complianceScore === 100 ? '#22C55E' : '#F59E0B'}30`
                }}
              >
                {isBlocked ? 'Blocked - Action Required' : complianceScore === 100 ? 'Ready To Drive' : 'Drive With Caution'}
              </span>
            </div>

            {/* Warnings Alert panel if Blocked */}
            {isBlocked ? (
              <div className="p-4 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/25 flex items-start gap-3">
                <AlertTriangle size={18} className="text-[#EF4444] mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-bold text-[12px] text-[#EF4444]">Critical Documents Missing / Expired</p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    Indian Motor Vehicles Act regulations strictly prohibit driving without a valid **Driving License** or **Third Party Insurance**. Start Driving has been blocked.
                  </p>
                </div>
              </div>
            ) : complianceScore < 100 ? (
              <div className="p-4 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/25 flex items-start gap-3">
                <AlertCircle size={18} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-bold text-[12px] text-[#F59E0B]">Partial Compliance Warning</p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    Some secondary required documents (e.g. PUC or RC) are missing or expired. You can proceed, but may face fines if inspected.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/25 flex items-start gap-3">
                <ShieldCheck size={18} className="text-[#22C55E] mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-bold text-[12px] text-[#22C55E]">100% Legally Compliant</p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    All required credentials are successfully verified and valid. Have a safe journey.
                  </p>
                </div>
              </div>
            )}

            {/* Itemized Lists */}
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {/* Missing Documents */}
              {missingDocs.length > 0 && (
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 text-left">Missing Credentials</span>
                  <div className="space-y-1.5">
                    {missingDocs.map(type => (
                      <div key={type} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950 border border-slate-900">
                        <span className="text-slate-350 capitalize font-medium">{type}</span>
                        <span className="text-[9px] font-bold text-[#EF4444] uppercase tracking-wider">Missing</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expired Documents */}
              {expiredDocs.length > 0 && (
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 text-left">Expired Credentials</span>
                  <div className="space-y-1.5">
                    {expiredDocs.map(type => (
                      <div key={type} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950 border border-slate-900">
                        <span className="text-slate-350 capitalize font-medium">{type}</span>
                        <span className="text-[9px] font-bold text-[#EF4444] uppercase tracking-wider">Expired</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2.5 pt-2">
              {isBlocked ? (
                <>
                  <button
                    onClick={() => setShowPreDriveModal(false)}
                    className="flex-1 py-4 rounded-2xl border border-slate-800 text-slate-400 font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => {
                      setShowPreDriveModal(false)
                      navigate('/document-vault')
                    }}
                    className="flex-1 py-4 rounded-2xl text-center text-white font-bold text-xs uppercase tracking-wider active:scale-97 transition-transform flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #8900F2 0%, #6B00C2 100%)',
                      boxShadow: '0 4px 16px rgba(137,0,242,0.4)',
                    }}
                  >
                    <Upload size={13} />
                    Open Vault
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowPreDriveModal(false)}
                    className="flex-1 py-4 rounded-2xl border border-slate-800 text-slate-400 font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setLoggingHistory(true)
                      const readinessStatus = complianceScore === 100 
                        ? 'Ready To Drive' 
                        : complianceScore >= 70 
                          ? 'Drive With Caution' 
                          : 'Not Ready'
                      await logReadinessHistory(complianceScore, readinessStatus)
                      setLoggingHistory(false)
                      setShowPreDriveModal(false)
                      navigate('/driving-mode')
                    }}
                    disabled={loggingHistory}
                    className="flex-1 py-4 rounded-2xl text-center text-white font-black text-xs uppercase tracking-wider active:scale-97 transition-transform flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #22C55E 0%, #15803D 100%)',
                      boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
                    }}
                  >
                    {loggingHistory ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Zap size={13} fill="currentColor" />
                    )}
                    <span>{loggingHistory ? 'Scanning Ledger...' : 'Confirm & Drive'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Notification Center Drawer ────────────────── */}
      {showNotificationDrawer && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full glass-strong rounded-t-[32px] p-6 pb-10 space-y-4 slide-up max-w-[440px] mx-auto border-t border-purple-500/20 shadow-2xl flex flex-col h-[75dvh]">
            {/* Handle bar */}
            <div className="flex justify-center -mt-2 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-800" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-900/60 flex-shrink-0">
              <div>
                <h2 className="font-black text-[16px] text-slate-200">Notification Center</h2>
                <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5">Proactive Legal Alerts</p>
              </div>
              <button
                onClick={() => setShowNotificationDrawer(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-900 border border-slate-800 active:scale-90 transition-transform"
              >
                <X size={14} className="text-slate-400" />
              </button>
            </div>

            {/* Controls & Filter tabs */}
            <div className="flex items-center justify-between gap-2 flex-shrink-0">
              <div className="flex bg-slate-950/80 border border-slate-900 rounded-xl p-1">
                {['All', 'Unread', 'Read'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                    style={{
                      background: activeTab === tab ? '#8900F2' : 'transparent',
                      color: activeTab === tab ? '#FFFFFF' : '#94A3B8'
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {notificationsEnabled && notifications.some(n => !n.isRead) && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[10px] font-black uppercase tracking-wider text-purple-400 px-3 py-2 bg-purple-500/5 border border-purple-500/10 rounded-xl active:scale-95 transition-transform"
                >
                  Mark All Read
                </button>
              )}
            </div>

            {/* Notification items list */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {loadingNotifications ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500">
                  <RefreshCw size={20} className="animate-spin text-purple-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Loading Alerts...</span>
                </div>
              ) : !notificationsEnabled ? (
                <div className="text-center py-12 px-4 text-slate-500">
                  <Bell size={24} className="mx-auto text-slate-700 mb-2 opacity-50" />
                  <p className="text-[11px] font-bold uppercase tracking-wider">System Notifications Disabled</p>
                  <p className="text-[10px] text-[#94A3B8] mt-1">Enable notifications in settings to receive proactive compliance and vehicle status warnings.</p>
                </div>
              ) : (
                (() => {
                  const filtered = notifications.filter(n => {
                    if (activeTab === 'Unread') return !n.isRead
                    if (activeTab === 'Read') return n.isRead
                    return true
                  })

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-16 text-slate-500">
                        <ShieldCheck size={28} className="mx-auto text-slate-700 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">All Clear</p>
                        <p className="text-[9px] text-[#94A3B8] mt-0.5">No notifications recorded under this filter.</p>
                      </div>
                    )
                  }

                  return filtered.map((n) => {
                    const isAlert = n.type?.startsWith('CHALLAN') || n.type?.startsWith('EXPIRY') || n.type?.startsWith('SEVERITY') || n.type?.startsWith('REPEAT')
                    const isRead = n.isRead
                    const dateStr = new Date(n.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })

                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!isRead) handleMarkAsRead(n.id)
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition-all active:scale-[0.99] relative overflow-hidden ${
                          isRead ? 'bg-[#131A22]/40 border-white/5 opacity-70' : 'bg-[#131A22] border-purple-500/15 cursor-pointer'
                        }`}
                      >
                        {!isRead && isAlert && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8900F2]" />
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="text-[11px] font-black text-slate-200 block leading-tight">
                              {n.title}
                            </span>
                            <p className="text-[10px] text-slate-400 font-medium leading-normal">
                              {n.message}
                            </p>
                            <span className="text-[8px] font-semibold text-[#94A3B8] block mt-1">
                              {dateStr}
                            </span>
                          </div>

                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-[#8900F2] flex-shrink-0 mt-1 shadow-[0_0_6px_#8900F2]" />
                          )}
                        </div>
                      </div>
                    )
                  })
                })()
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
