import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Navigation, Square, AlertTriangle, Clock, Gauge,
  Compass, AlertOctagon, Zap, RefreshCw, ShieldAlert
} from 'lucide-react'
import { collection, addDoc, updateDoc, doc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'
import { speakAlert, setVoiceAlertsEnabled, setVoiceLanguage } from '../services/voiceEngine'
import {
  evaluateSpeedLimit,
  detectOffRoute,
  calcRemainingDistance,
  calcSafetyScore,
  checkZoneProximity,
  EVENT_TYPES,
  getDistanceKm
} from '../services/trafficRuleEngine'
import toast from 'react-hot-toast'

const COIMBATORE_CENTER = [11.0168, 76.9558]

// ── Map icons ──────────────────────────────────────────────────────────────
const vehicleIcon = L.divIcon({
  html: '<div class="w-8 h-8 rounded-full bg-[#8900F2] border-4 border-white flex items-center justify-center shadow-lg shadow-purple-500/80 animate-pulse"><div class="w-2.5 h-2.5 rounded-full bg-white"></div></div>',
  className: 'custom-vehicle-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
})

const startIcon = L.divIcon({
  html: '<div class="w-6 h-6 rounded-full bg-[#3B82F6] border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-lg">S</div>',
  className: 'custom-map-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

const endIcon = L.divIcon({
  html: '<div class="w-6 h-6 rounded-full bg-[#8900F2] border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-lg">D</div>',
  className: 'custom-map-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

// ── Map auto-center ────────────────────────────────────────────────────────
function VehicleMapController({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, map.getZoom(), { animate: true })
  }, [center, map])
  return null
}

// ── HUD Metric ──────────────────────────────────────────────────────────────
function HudMetric({ label, value, unit, glow = false }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="font-black leading-none"
        style={{
          fontSize: '22px',
          color: glow ? '#8900F2' : 'var(--text)',
          textShadow: glow ? '0 0 15px rgba(137,0,242,0.6)' : 'none',
        }}
      >
        {value}
      </span>
      <span className="text-[9px] font-bold tracking-widest uppercase mt-1.5" style={{ color: '#667085' }}>
        {label}
      </span>
      <span className="text-[7px] text-[#8900F2] font-black uppercase mt-0.5 tracking-wider">
        {unit}
      </span>
    </div>
  )
}

// ── Speed Limit Badge ───────────────────────────────────────────────────────
function SpeedLimitBadge({ speedResult }) {
  if (!speedResult || !speedResult.speedLimit) return null

  const colors = {
    Warning:    { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.55)', text: '#F59E0B' },
    'High Risk':{ bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.55)',  text: '#EF4444' },
    Violation:  { bg: 'rgba(239,68,68,0.25)',  border: 'rgba(239,68,68,0.8)',   text: '#EF4444' },
  }
  const c = speedResult.warningLevel ? colors[speedResult.warningLevel] : {
    bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.4)', text: '#22C55E'
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-2xl"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-[13px]"
        style={{ background: c.border + '30', color: c.text }}
      >
        {speedResult.speedLimit}
      </div>
      <div>
        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Speed Limit</p>
        <p className="font-black text-[11px] mt-0.5" style={{ color: c.text }}>
          {speedResult.warningLevel || 'Within Limit'}
        </p>
      </div>
    </div>
  )
}

// ── Format seconds as MM:SS ─────────────────────────────────────────────────
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ═══════════════════════════════════════════════════════════════════════════
export default function DrivingMode() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { user }   = useAuth()
  const { profile} = useUserProfile()

  // Voice config
  useEffect(() => {
    if (profile?.settings) {
      setVoiceAlertsEnabled(profile.settings.voiceAlerts !== false)
      setVoiceLanguage(profile.settings.language || 'en')
    }
  }, [profile])

  // ── Route & session state ────────────────────────────────────────────────
  const [activeRoute,       setActiveRoute]       = useState(null)
  const [polylineCoords,    setPolylineCoords]    = useState([])
  const [sessionActive,     setSessionActive]     = useState(false)
  const [sessionId,         setSessionId]         = useState(null)

  // ── Telemetry state ───────────────────────────────────────────────────────
  const [currentLocation,   setCurrentLocation]   = useState(null)
  const [speed,             setSpeed]             = useState(0)
  const [accuracy,          setAccuracy]          = useState(0)
  const [distanceRemaining, setDistanceRemaining] = useState(0)
  const [etaTime,           setEtaTime]           = useState('--:--')
  const [sessionDuration,   setSessionDuration]   = useState(0)
  const [distanceTravelled, setDistanceTravelled] = useState(0)

  // ── Traffic rule state ────────────────────────────────────────────────────
  const [offRoute,          setOffRoute]          = useState(false)
  const [activeHazard,      setActiveHazard]      = useState(null)
  const [speedResult,       setSpeedResult]       = useState(null)

  // ── GPS gate ─────────────────────────────────────────────────────────────
  const [gpsDenied,         setGpsDenied]         = useState(false)

  // ── Zone caches (all types from trafficZones collection) ─────────────────
  const [allZones, setAllZones] = useState({ school: [], hospital: [], accident: [], speed: [] })

  // ── Refs ──────────────────────────────────────────────────────────────────
  const watchIdRef          = useRef(null)
  const lastLocationRef     = useRef(null)
  const loggedEventsRef     = useRef(new Set())    // deduplication
  const warningsCountRef    = useRef(0)
  const violationsCountRef  = useRef(0)
  const tickCountRef        = useRef(0)
  const speedSumRef         = useRef(0)
  const lastProcessRef      = useRef(0)            // debounce timestamp
  const polylineCoordsRef   = useRef([])

  // keep polyline ref in sync so telemetry callback always has latest
  useEffect(() => {
    polylineCoordsRef.current = polylineCoords
  }, [polylineCoords])

  // ── Load planned route ────────────────────────────────────────────────────
  useEffect(() => {
    let route = location.state?.activeRoute
    if (!route) {
      try {
        const stored = sessionStorage.getItem('active_planned_route')
        if (stored) route = JSON.parse(stored)
      } catch (e) {
        console.warn('[DrivingMode] Failed to parse stored route:', e)
      }
    }
    if (route) {
      setActiveRoute(route)
      const coords = route.geometry?.coordinates || route.routeTelemetry?.geometry?.coordinates
      if (coords && Array.isArray(coords)) {
        const mapped = coords.map(c => [c[1], c[0]])
        setPolylineCoords(mapped)
        if (mapped.length > 0) setCurrentLocation(mapped[0])
      }
    }
  }, [location.state])

  // ── Load hazard zones from unified trafficZones collection ────────────────
  useEffect(() => {
    async function loadZones() {
      try {
        // Try unified collection first
        const snap = await getDocs(collection(db, 'trafficZones'))
        if (!snap.empty) {
          const grouped = { school: [], hospital: [], accident: [], speed: [] }
          snap.docs.forEach(d => {
            const z = d.data()
            const t = z.type
            if (grouped[t]) grouped[t].push(z)
          })
          setAllZones(grouped)
          return
        }
      } catch {
        // fall through to legacy collections
      }

      // Fallback: legacy separate collections
      try {
        const [schoolSnap, hospitalSnap, accidentSnap, speedSnap] = await Promise.all([
          getDocs(collection(db, 'schoolZones')),
          getDocs(collection(db, 'hospitalZones')),
          getDocs(collection(db, 'accidentZones')),
          getDocs(collection(db, 'speedZones')),
        ])
        setAllZones({
          school:   schoolSnap.docs.map(d => ({ ...d.data(), type: 'school' })),
          hospital: hospitalSnap.docs.map(d => ({ ...d.data(), type: 'hospital' })),
          accident: accidentSnap.docs.map(d => ({ ...d.data(), type: 'accident' })),
          speed:    speedSnap.docs.map(d => ({ ...d.data(), type: 'speed' })),
        })
      } catch (err) {
        console.warn('[DrivingMode] Failed to load hazard zones:', err.message)
      }
    }
    loadZones()
  }, [])

  // ── Start Firestore session ────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid || !activeRoute || sessionActive) return

    async function startSession() {
      try {
        const docRef = await addDoc(collection(db, 'drivingSessions'), {
          userId:           user.uid,
          routeId:          activeRoute.analysisId || 'custom_planned_route',
          source:           activeRoute.source      || 'Start',
          destination:      activeRoute.destination  || 'Destination',
          startedAt:        new Date().toISOString(),
          endedAt:          null,
          status:           'Active',
          distanceTravelled: 0,
          averageSpeed:     0,
          warningsCount:    0,
          violationsCount:  0,
          duration:         0,
          createdAt:        new Date().toISOString(),
        })
        setSessionId(docRef.id)
        setSessionActive(true)
        toast.success('Live session started')
      } catch (err) {
        console.error('[DrivingMode] Failed to start session:', err)
      }
    }
    startSession()
  }, [user?.uid, activeRoute, sessionActive])

  // ── Duration clock ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionActive) return
    const timer = setInterval(() => setSessionDuration(prev => prev + 1), 1000)
    return () => clearInterval(timer)
  }, [sessionActive])

  // ── Core telemetry processor (debounced via RAF) ──────────────────────────
  const processTelemetry = useCallback((coord, currentSpeed, currentAccuracy) => {
    const now = Date.now()
    // Debounce: process at most every 800 ms
    if (now - lastProcessRef.current < 800) {
      // Still update visual speed immediately
      setSpeed(Math.round(currentSpeed))
      setCurrentLocation(coord)
      return
    }
    lastProcessRef.current = now

    setCurrentLocation(coord)
    setSpeed(Math.round(currentSpeed))
    setAccuracy(Number(currentAccuracy.toFixed(1)))

    tickCountRef.current += 1
    speedSumRef.current += currentSpeed

    // Distance accumulation
    if (lastLocationRef.current) {
      const step = getDistanceKm(
        lastLocationRef.current[0], lastLocationRef.current[1],
        coord[0], coord[1]
      )
      if (step < 2) {
        setDistanceTravelled(prev => Number((prev + step).toFixed(3)))
      }
    }
    lastLocationRef.current = coord

    const poly = polylineCoordsRef.current
    if (poly.length === 0) return

    // A. Off-Route Detection
    const { offRoute: isOffRoute, deviationMeters, closestIndex } = detectOffRoute(coord, poly)
    setOffRoute(isOffRoute)

    if (isOffRoute) {
      speakAlert('OFF_ROUTE', 'You are off the planned route.')
      warningsCountRef.current += 1

      if (user?.uid && sessionId) {
        const key = EVENT_TYPES.OFF_ROUTE
        if (!loggedEventsRef.current.has(key)) {
          loggedEventsRef.current.add(key)
          // Write to subcollection (Feature 6)
          addDoc(collection(db, 'drivingSessions', sessionId, 'events'), {
            type:      EVENT_TYPES.OFF_ROUTE,
            message:   `Vehicle deviated ${deviationMeters}m from planned route.`,
            latitude:  coord[0],
            longitude: coord[1],
            timestamp: new Date().toISOString(),
          }).catch(console.error)
          // Also write to root collection for backward compatibility
          addDoc(collection(db, 'drivingEvents'), {
            sessionId, userId: user.uid,
            type:      EVENT_TYPES.OFF_ROUTE,
            message:   `Vehicle deviated ${deviationMeters}m from route vector.`,
            createdAt: new Date().toISOString(),
          }).catch(console.error)
        }
      }
    }

    // B. Remaining distance & ETA
    const remaining = calcRemainingDistance(poly, closestIndex)
    setDistanceRemaining(remaining)
    const speedForEta = currentSpeed > 5 ? currentSpeed : 42
    const etaMs = (remaining / speedForEta) * 60 * 60 * 1000
    const etaDate = new Date(Date.now() + etaMs)
    setEtaTime(etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }))

    // C. Zone Proximity Checks (Features 2, 3, 4)
    const zoneChecks = [
      { list: allZones.school,   typeLabel: 'School Zone',   eventConst: EVENT_TYPES.SCHOOL_ZONE,   voiceKey: 'SCHOOL_ZONE',   voiceMsg: 'School zone ahead. Reduce speed.' },
      { list: allZones.hospital, typeLabel: 'Hospital Zone', eventConst: EVENT_TYPES.HOSPITAL_ZONE, voiceKey: 'HOSPITAL_ZONE', voiceMsg: 'Hospital zone. Avoid unnecessary horn usage.' },
      { list: allZones.accident, typeLabel: 'Accident Zone', eventConst: EVENT_TYPES.ACCIDENT_ZONE, voiceKey: 'ACCIDENT_ZONE', voiceMsg: 'Accident prone area ahead. Drive carefully.' },
      { list: allZones.speed,    typeLabel: 'Speed Zone',    eventConst: EVENT_TYPES.SPEED_WARNING,  voiceKey: 'SPEED_ZONE',    voiceMsg: 'Speed restriction zone ahead.' },
    ]

    let nearestHazard = null
    let nearestDist   = Infinity

    for (const { list, typeLabel, eventConst, voiceKey, voiceMsg } of zoneChecks) {
      const hits = checkZoneProximity(coord, list)
      if (hits.length === 0) continue

      const hit = hits[0]
      speakAlert(voiceKey, voiceMsg)

      if (hit._distKm < nearestDist) {
        nearestDist = hit._distKm
        nearestHazard = {
          type:       typeLabel,
          name:       hit.name,
          distance:   hit._distMeters,
          speedLimit: hit.speedLimitKmh || null,
          riskLevel:  hit.riskLevel    || null,
        }
      }

      // Log once per zone entry
      if (user?.uid && sessionId) {
        const key = `${eventConst}_${hit.name}`
        if (!loggedEventsRef.current.has(key)) {
          loggedEventsRef.current.add(key)
          warningsCountRef.current += 1

          addDoc(collection(db, 'drivingSessions', sessionId, 'events'), {
            type:      eventConst,
            message:   `Entered ${typeLabel}: "${hit.name}" (${hit._distMeters}m away)`,
            latitude:  coord[0],
            longitude: coord[1],
            timestamp: new Date().toISOString(),
          }).catch(console.error)

          addDoc(collection(db, 'drivingEvents'), {
            sessionId, userId: user.uid,
            type:    eventConst,
            message: `Driver entered ${typeLabel} "${hit.name}". Alert radius: ${hit.radius || 150}m.`,
            createdAt: new Date().toISOString(),
          }).catch(console.error)
        }
      }
    }
    setActiveHazard(nearestHazard)

    // D. Speed Limit Evaluation (Feature 1)
    // Use nearest speed zone limit, or active hazard limit
    const activeSpeedZones = checkZoneProximity(coord, allZones.speed)
    const limitKmh = activeSpeedZones[0]?.speedLimitKmh || nearestHazard?.speedLimit || 0
    const result = evaluateSpeedLimit(currentSpeed, limitKmh)
    setSpeedResult(result)

    // Log speed violation once per threshold crossing
    if (result.violation && user?.uid && sessionId) {
      const key = `${EVENT_TYPES.SPEED_WARNING}_${Math.floor(currentSpeed / 5) * 5}`
      if (!loggedEventsRef.current.has(key)) {
        loggedEventsRef.current.add(key)
        violationsCountRef.current += 1
        speakAlert('SPEED_WARNING', `Speed limit is ${limitKmh} km/h. You are driving too fast.`)

        addDoc(collection(db, 'drivingSessions', sessionId, 'events'), {
          type:      EVENT_TYPES.SPEED_WARNING,
          message:   `Speed violation: ${Math.round(currentSpeed)} km/h in a ${limitKmh} km/h zone. Level: ${result.warningLevel}`,
          latitude:  coord[0],
          longitude: coord[1],
          timestamp: new Date().toISOString(),
        }).catch(console.error)
      }
    }
  }, [allZones, sessionId, user?.uid])

  // Keep processTelemetry ref up to date
  const processTelemetryRef = useRef(processTelemetry)
  useEffect(() => { processTelemetryRef.current = processTelemetry }, [processTelemetry])

  // ── GPS watcher ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }

    if (!('geolocation' in navigator)) {
      setGpsDenied(true)
      toast.error('Geolocation API not supported by this browser.')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setGpsDenied(false)
        const lat  = position.coords.latitude
        const lng  = position.coords.longitude
        const spd  = position.coords.speed   != null ? Math.max(0, position.coords.speed * 3.6) : 0
        const acc  = position.coords.accuracy != null ? position.coords.accuracy : 0

        // Schedule processing via requestAnimationFrame for smooth UI
        requestAnimationFrame(() => {
          processTelemetryRef.current([lat, lng], spd, acc)
        })
      },
      (err) => {
        console.warn('[DrivingMode] GPS blocked:', err.message)
        setGpsDenied(true)
        toast.error('Location access is required to start Driving Mode.')
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [sessionActive])

  // ── STOP DRIVING ──────────────────────────────────────────────────────────
  async function handleStop() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    const avgSpeed      = tickCountRef.current > 0 ? Math.round(speedSumRef.current / tickCountRef.current) : 0
    const warnCount     = warningsCountRef.current
    const violCount     = violationsCountRef.current
    const safetyScore   = calcSafetyScore(warnCount, violCount)
    const finalDist     = Number(distanceTravelled.toFixed(2))
    const finalDuration = sessionDuration

    if (sessionId) {
      try {
        await updateDoc(doc(db, 'drivingSessions', sessionId), {
          endedAt:          new Date().toISOString(),
          status:           'Completed',
          distanceTravelled: finalDist,
          averageSpeed:     avgSpeed,
          warningsCount:    warnCount,
          violationsCount:  violCount,
          safetyScore,
          duration:         finalDuration,
        })

        // Recalculate trust score
        try {
          const { recalculateTrustScore } = await import('../services/trustScoreService')
          await recalculateTrustScore(user.uid)
        } catch (tErr) {
          console.warn('[DrivingMode] Trust score recalc failed:', tErr.message)
        }
      } catch (err) {
        console.error('[DrivingMode] Failed to finalize session:', err)
      }
    }

    // Navigate to session summary (Feature 7)
    navigate('/driving-summary', {
      replace: true,
      state: {
        sessionId,
        source:          activeRoute?.source      || 'Start',
        destination:     activeRoute?.destination  || 'Destination',
        duration:        finalDuration,
        distanceTravelled: finalDist,
        averageSpeed:    avgSpeed,
        warningsCount:   warnCount,
        violationsCount: violCount,
        safetyScore,
      }
    })
  }

  // ── GPS denied fallback ───────────────────────────────────────────────────
  if (gpsDenied) {
    return (
      <div className="min-h-[100dvh] pb-[80px] flex flex-col items-center justify-center p-6 text-center"
           style={{ background: 'var(--bg)' }}>
        <div className="p-8 rounded-3xl space-y-6 max-w-sm glass-strong relative overflow-hidden"
             style={{ border: '1px solid rgba(137,0,242,0.18)' }}>
          <div className="absolute left-0 top-0 right-0 h-1 bg-[#8900F2]" />
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-red-500/10 border border-red-500/25 mx-auto">
            <AlertTriangle size={28} className="text-red-500 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h3 className="font-black text-slate-200 text-lg">GPS Access Required</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Location access is required to start Driving Mode. Please enable GPS permissions to track route progress and risk zones.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => {
                setGpsDenied(false)
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setGpsDenied(false)
                    toast.success('GPS signal acquired.')
                    processTelemetry([pos.coords.latitude, pos.coords.longitude], pos.coords.speed || 0, pos.coords.accuracy || 5)
                  },
                  () => {
                    setGpsDenied(true)
                    toast.error('Location permission is blocked. Check system settings.')
                  }
                )
              }}
              className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #8900F2 0%, #6B00C2 100%)', boxShadow: '0 4px 16px rgba(137,0,242,0.3)' }}
            >
              Enable Location
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-400 active:scale-95 transition-transform bg-slate-900 border border-slate-800"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── No route fallback ─────────────────────────────────────────────────────
  if (!activeRoute) {
    return (
      <div className="min-h-[100dvh] pb-[80px] flex flex-col items-center justify-center p-6 text-center"
           style={{ background: 'var(--bg)' }}>
        <div className="p-8 rounded-3xl space-y-5 max-w-sm glass-strong relative overflow-hidden"
             style={{ border: '1px solid rgba(137,0,242,0.18)' }}>
          <div className="absolute left-0 top-0 right-0 h-1 bg-[#8900F2]" />
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-purple-500/10 border border-purple-500/25 mx-auto">
            <AlertOctagon size={28} className="text-[#8900F2]" />
          </div>
          <div className="space-y-2">
            <h3 className="font-black text-slate-200 text-lg">No Journey Planned</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time driving HUD, hazard radar, and speed enforcement require a planned trip.
            </p>
          </div>
          <button
            onClick={() => navigate('/plan-trip')}
            className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #8900F2 0%, #6B00C2 100%)', boxShadow: '0 4px 16px rgba(137,0,242,0.3)' }}
          >
            Go to Plan Trip
          </button>
        </div>
      </div>
    )
  }

  const startLatLng = polylineCoords[0] || null
  const endLatLng   = polylineCoords[polylineCoords.length - 1] || null

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Map ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0"
           style={{ transform: 'perspective(600px) rotateX(15deg) scale(1.18)', transformOrigin: 'center 60%' }}>
        <MapContainer
          center={currentLocation || COIMBATORE_CENTER}
          zoom={15}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          attributionControl={false}
          dragging={true}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {startLatLng && <Marker position={startLatLng} icon={startIcon} />}
          {endLatLng   && <Marker position={endLatLng}   icon={endIcon}   />}
          {polylineCoords.length > 0 && (
            <>
              <Polyline positions={polylineCoords} color="#8900F2" weight={8} opacity={0.25} />
              <Polyline positions={polylineCoords} color="#a855f7" weight={4} opacity={0.85} />
            </>
          )}
          {currentLocation && (
            <>
              <Marker position={currentLocation} icon={vehicleIcon} />
              <VehicleMapController center={currentLocation} />
            </>
          )}
        </MapContainer>
      </div>

      {/* Ambient overlays */}
      <div className="absolute inset-0 z-[1] pointer-events-none"
           style={{ background: 'linear-gradient(to bottom, rgba(8,9,13,0.55) 0%, transparent 35%, rgba(8,9,13,0.7) 70%, rgba(8,9,13,0.98) 100%)' }} />
      <div className="absolute inset-0 z-[1] pointer-events-none"
           style={{ background: 'radial-gradient(ellipse at 50% 60%, rgba(137,0,242,0.14) 0%, transparent 65%)' }} />

      {/* ── Live Session Header Pill ───────────────────── */}
      <div className="absolute top-4 left-0 right-0 z-30 flex justify-center pointer-events-none pt-12">
        <div className="flex items-center gap-2.5 px-5 py-2 rounded-full pointer-events-auto shadow-2xl bg-[#0F1117]/90 border border-purple-500/20 backdrop-blur-md">
          <div className="relative w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0">
            <span className="absolute -inset-1 rounded-full bg-emerald-500/40 animate-ping" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-100">
            Live Driving Session
          </span>
        </div>
      </div>

      {/* ── Off-Route Banner ──────────────────────────── */}
      {offRoute && (
        <div className="absolute top-28 left-4 right-4 z-30 slide-up">
          <div
            className="flex items-center gap-3 px-4 py-3.5 rounded-3xl"
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '2px solid rgba(239,68,68,0.6)',
              boxShadow: '0 0 30px rgba(239,68,68,0.35)',
            }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/30 animate-pulse flex-shrink-0">
              <AlertTriangle size={18} className="text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[12px] text-red-500 uppercase tracking-widest leading-none">OFF ROUTE</p>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Vehicle deviated &gt;200m from planned coordinates.</p>
            </div>
            {/* Feature 5 — Recalculate Route */}
            <button
              onClick={() => navigate('/plan-trip')}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-500/15 border border-red-500/30 active:scale-95 transition-transform"
            >
              <RefreshCw size={11} className="text-red-400" />
              <span className="text-[9px] font-black text-red-400 uppercase tracking-wider">Recalculate</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Hazard Alert Card ─────────────────────────── */}
      {activeHazard && !offRoute && (
        <div className="absolute top-28 left-4 right-4 z-30 slide-up">
          <div
            className="flex items-center gap-3 px-4 py-3.5 rounded-3xl"
            style={{
              background: activeHazard.type === 'Accident Zone' ? 'rgba(239,68,68,0.15)' : 'rgba(137,0,242,0.15)',
              border: `2px solid ${activeHazard.type === 'Accident Zone' ? 'rgba(239,68,68,0.5)' : 'rgba(137,0,242,0.5)'}`,
              boxShadow: `0 0 30px ${activeHazard.type === 'Accident Zone' ? 'rgba(239,68,68,0.25)' : 'rgba(137,0,242,0.25)'}`,
            }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-500/10 border border-purple-500/25 flex-shrink-0">
              <Compass size={18} className={activeHazard.type === 'Accident Zone' ? 'text-red-500' : 'text-[#8900F2]'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[9px] text-purple-400 uppercase tracking-widest leading-none">Radar Alert</p>
              <h4 className="font-black text-[12px] text-slate-200 mt-0.5 truncate">{activeHazard.name}</h4>
              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                {activeHazard.type} · {activeHazard.distance}m
                {activeHazard.speedLimit && ` · Limit: ${activeHazard.speedLimit} km/h`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Speed Violation Banner ────────────────────── */}
      {speedResult?.violation && !offRoute && !activeHazard && (
        <div className="absolute top-28 left-4 right-4 z-30 slide-up">
          <div
            className="flex items-center gap-3 px-4 py-3.5 rounded-3xl"
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '2px solid rgba(239,68,68,0.55)',
              boxShadow: '0 0 24px rgba(239,68,68,0.25)',
            }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/30 flex-shrink-0 animate-pulse">
              <ShieldAlert size={18} className="text-red-500" />
            </div>
            <div className="flex-1">
              <p className="font-black text-[12px] text-red-500 uppercase tracking-widest leading-none">
                {speedResult.warningLevel}
              </p>
              <p className="text-[9px] font-semibold text-slate-400 mt-0.5">
                Speed limit: {speedResult.speedLimit} km/h · Current: {speed} km/h
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation Indicator (calm state) ────────── */}
      {!offRoute && !activeHazard && !speedResult?.violation && (
        <div className="absolute top-28 left-4 z-20 slide-up">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
               style={{ background: 'rgba(15,17,23,0.9)', border: '1px solid rgba(137,0,242,0.22)' }}>
            <Navigation size={15} style={{ color: '#8900F2' }} className="rotate-45" />
            <div>
              <p className="font-black text-xs text-slate-200 uppercase tracking-wider">Navigation Active</p>
              <p className="text-[9px] font-semibold text-slate-400 mt-0.5 truncate max-w-[200px]">
                {activeRoute.source} ➔ {activeRoute.destination}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Counters Pill (top-right) ──────────────────── */}
      <div className="absolute top-28 right-4 z-20 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0F1117]/90 border border-amber-500/20 backdrop-blur-md">
          <AlertTriangle size={10} className="text-amber-500" />
          <span className="text-[9px] font-black text-amber-400">{warningsCountRef.current}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0F1117]/90 border border-red-500/20 backdrop-blur-md">
          <Zap size={10} className="text-red-500" />
          <span className="text-[9px] font-black text-red-400">{violationsCountRef.current}</span>
        </div>
      </div>

      {/* ── Bottom HUD ────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 glass-strong sheet-shadow rounded-t-[32px] pb-[85px] pt-5 px-5 flex flex-col gap-4">

        {/* GPS status strip */}
        <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold px-1">
          <span>
            {currentLocation
              ? `${currentLocation[0].toFixed(5)}°N, ${currentLocation[1].toFixed(5)}°E`
              : 'ACQUIRING GPS...'}
          </span>
          <span>±{accuracy}m</span>
        </div>

        {/* Speedometer row */}
        <div className="flex items-center justify-between px-1 pb-3"
             style={{ borderBottom: '1px solid rgba(137,0,242,0.12)' }}>
          <HudMetric label="ETA" value={etaTime} unit="arrival" />
          <div className="w-px h-10 bg-slate-900" />

          {/* Central speed gauge */}
          <div className="relative flex items-center justify-center">
            <div
              className="w-24 h-24 rounded-full flex flex-col items-center justify-center"
              style={{
                background: speedResult?.violation
                  ? 'linear-gradient(135deg, rgba(239,68,68,0.22), rgba(239,68,68,0.06))'
                  : 'linear-gradient(135deg, rgba(137,0,242,0.18), rgba(137,0,242,0.05))',
                border: `2px solid ${speedResult?.violation ? 'rgba(239,68,68,0.5)' : 'rgba(137,0,242,0.35)'}`,
                boxShadow: `0 0 30px ${speedResult?.violation ? 'rgba(239,68,68,0.35)' : 'rgba(137,0,242,0.35)'}, inset 0 0 20px transparent`,
                transition: 'border-color 0.3s, box-shadow 0.3s',
              }}
            >
              <span className="font-black text-3xl leading-none text-slate-100">{speed}</span>
              <span className="text-[9px] font-black tracking-widest text-[#8900F2] mt-1">KM/H</span>
            </div>
          </div>

          <div className="w-px h-10 bg-slate-900" />
          <HudMetric label="Duration" value={formatDuration(sessionDuration)} unit="elapsed" />
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-slate-950/70 border border-slate-900">
            <Clock size={13} style={{ color: '#8900F2' }} />
            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Remaining</p>
              <p className="font-black text-[12px] text-slate-200 mt-0.5">{distanceRemaining} km</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-slate-950/70 border border-slate-900">
            <Gauge size={13} style={{ color: '#8900F2' }} />
            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Travelled</p>
              <p className="font-black text-[12px] text-slate-200 mt-0.5">{distanceTravelled.toFixed(1)} km</p>
            </div>
          </div>
        </div>

        {/* Speed Limit widget */}
        {speedResult?.speedLimit > 0 && (
          <SpeedLimitBadge speedResult={speedResult} />
        )}

        {/* STOP button */}
        <button
          onClick={handleStop}
          className="w-full py-[17px] rounded-3xl font-black text-[14px] tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-transform text-white cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #EF4444 0%, #C41212 100%)',
            boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
          }}
        >
          <Square size={12} strokeWidth={2.5} fill="currentColor" />
          STOP DRIVING
        </button>
      </div>
    </div>
  )
}
