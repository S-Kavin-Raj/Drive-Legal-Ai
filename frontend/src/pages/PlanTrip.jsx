import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, X, ArrowRight, Navigation, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react'
import { fetchPlaceSuggestions } from '../services/orsService'
import { analyzeRoute } from '../services/routeService'
import { useAuth } from '../hooks/useAuth'
import { useComplianceProfile } from '../hooks/useComplianceProfile'
import toast from 'react-hot-toast'

const DEFAULT_CENTER = [11.0168, 76.9558] // Coimbatore / Tiruppur center region

// Custom DivIcons for Source and Destination pins
const srcIcon = L.divIcon({
  html: '<div class="w-6 h-6 rounded-full bg-[#3B82F6] border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-blue-500/40">S</div>',
  className: 'custom-map-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

const destIcon = L.divIcon({
  html: '<div class="w-6 h-6 rounded-full bg-[#8900F2] border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-purple-500/40">D</div>',
  className: 'custom-map-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

// Sub-component to handle programmatically updating Leaflet bounds to fit the route
function MapController({ polylineCoords }) {
  const map = useMap()

  useEffect(() => {
    if (!polylineCoords || polylineCoords.length === 0) return
    try {
      const bounds = L.latLngBounds(polylineCoords)
      map.fitBounds(bounds, { padding: [60, 60], animate: true, duration: 1.2 })
    } catch (e) {
      console.warn('[MapController] Failed to fit bounds:', e)
    }
  }, [polylineCoords, map])

  return null
}

export default function PlanTrip() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { complianceScore, complianceStatus } = useComplianceProfile()

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [sourceSuggestions, setSourceSuggestions] = useState([])
  const [destSuggestions, setDestSuggestions] = useState([])

  const [selectedSource, setSelectedSource] = useState(null) // { name, coordinates: [lng, lat] }
  const [selectedDest, setSelectedDest] = useState(null) // { name, coordinates: [lng, lat] }

  const [activeInput, setActiveInput] = useState(null) // 'source' or 'dest'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeRoute, setActiveRoute] = useState(null)

  const sourceRef = useRef(null)
  const destRef = useRef(null)

  // Autocomplete place suggestion for Source Location
  useEffect(() => {
    let active = true
    if (activeInput !== 'source' || from.trim().length < 3) {
      setSourceSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      const results = await fetchPlaceSuggestions(from)
      if (active) setSourceSuggestions(results)
    }, 300)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [from, activeInput])

  // Autocomplete place suggestion for Destination Location
  useEffect(() => {
    let active = true
    if (activeInput !== 'dest' || to.trim().length < 3) {
      setDestSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      const results = await fetchPlaceSuggestions(to)
      if (active) setDestSuggestions(results)
    }, 300)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [to, activeInput])

  // Click outside to dismiss suggestions
  useEffect(() => {
    function handleClickOutside(e) {
      if (sourceRef.current && !sourceRef.current.contains(e.target)) {
        setSourceSuggestions([])
      }
      if (destRef.current && !destRef.current.contains(e.target)) {
        setDestSuggestions([])
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const canAnalyse = from.trim().length > 0 && to.trim().length > 0 && !loading

  async function handleAnalyse() {
    if (!from.trim() || !to.trim()) {
      toast.error('Source and destination coordinates are required')
      return
    }

    setLoading(true)
    setError(null)
    setActiveRoute(null)

    try {
      // Call standard analyzeRoute endpoint
      const result = await analyzeRoute({
        source: selectedSource || from,
        destination: selectedDest || to,
        userId: user?.uid || 'test-user',
        complianceScore: complianceScore || 100,
        documentStatus: complianceStatus || 'Ready'
      })

      if (!result || !result.geometry) {
        throw new Error('No driving route directions found between these locations')
      }

      setActiveRoute(result)
      toast.success('Route analyzed successfully')
    } catch (err) {
      console.error('[PlanTrip] Route analysis failed:', err)
      const msg = err?.response?.data?.error || err.message || 'Route analysis failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // Parse Leaflet Polyline points from response geometry
  let polylineCoords = []
  if (activeRoute?.geometry?.coordinates) {
    polylineCoords = activeRoute.geometry.coordinates.map((c) => [c[1], c[0]])
  }

  const srcLatLng = polylineCoords[0] || null
  const destLatLng = polylineCoords[polylineCoords.length - 1] || null

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Full-screen map ───────────────────────── */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={DEFAULT_CENTER} zoom={11}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false} attributionControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          
          {/* Source and Destination Markers */}
          {srcLatLng && <Marker position={srcLatLng} icon={srcIcon} />}
          {destLatLng && <Marker position={destLatLng} icon={destIcon} />}

          {/* Glowing Purple Route Polyline */}
          {polylineCoords.length > 0 && (
            <>
              {/* Outer neon purple glow */}
              <Polyline
                positions={polylineCoords}
                color="#8900F2"
                weight={8}
                opacity={0.3}
                lineJoin="round"
                lineCap="round"
              />
              {/* Inner clean polyline */}
              <Polyline
                positions={polylineCoords}
                color="#a855f7"
                weight={4}
                opacity={0.9}
                lineJoin="round"
                lineCap="round"
              />
            </>
          )}

          {/* Dynamic map bound panner */}
          <MapController polylineCoords={polylineCoords} />
        </MapContainer>
      </div>

      {/* ── Top floating search panel ─────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-12 px-4 pb-4 map-gradient-top">
        <div className="glass-strong rounded-3xl p-4 slide-up space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-black text-[18px]" style={{ color: 'var(--text)' }}>Plan Trip</h2>
              <p className="text-[11px] font-medium" style={{ color: 'var(--muted)' }}>Enter your route below</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-8 h-8 rounded-2xl flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: 'rgba(137,0,242,0.12)', border: '1px solid rgba(137,0,242,0.25)' }}
            >
              <X size={15} style={{ color: '#8900F2' }} />
            </button>
          </div>

          {/* Input Preparation Fields */}
          <div className="relative space-y-2">
            {/* Dashed connector vertical bar */}
            <div className="absolute left-[22px] top-[44px] w-px h-6"
                 style={{ borderLeft: '2px dashed rgba(137,0,242,0.3)' }} />

            {/* Source Input */}
            <div className="relative" ref={sourceRef}>
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: 'rgba(22,27,38,0.9)', border: `1px solid rgba(137,0,242,0.18)` }}
              >
                <MapPin size={16} style={{ color: '#8900F2', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="From — Current location"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value)
                    setSelectedSource(null)
                  }}
                  onFocus={() => setActiveInput('source')}
                  className="flex-1 bg-transparent outline-none text-[14px] font-semibold placeholder:font-normal"
                  style={{ color: 'var(--text)', caretColor: '#8900F2' }}
                />
                {from && (
                  <button onClick={() => { setFrom(''); setSelectedSource(null); }} className="active:scale-90 transition-transform">
                    <X size={14} style={{ color: 'var(--muted)' }} />
                  </button>
                )}
              </div>

              {/* Source Autocomplete Dropdown */}
              {sourceSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-slate-950/95 border border-slate-900 rounded-2xl shadow-2xl max-h-48 overflow-y-auto z-40">
                  {sourceSuggestions.map((place) => (
                    <button
                      key={place.id}
                      onClick={() => {
                        setFrom(place.place_name)
                        setSelectedSource({
                          name: place.place_name,
                          coordinates: place.geometry.coordinates,
                        })
                        setSourceSuggestions([])
                      }}
                      className="w-full text-left px-4 py-3 text-xs text-slate-350 hover:bg-[#8900F2]/10 hover:text-white cursor-pointer border-b border-slate-900/60 last:border-b-0 font-medium"
                    >
                      {place.place_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Destination Input */}
            <div className="relative" ref={destRef}>
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: 'rgba(22,27,38,0.9)', border: `1px solid rgba(137,0,242,0.18)` }}
              >
                <MapPin size={16} style={{ color: '#667085', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="To — Destination"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value)
                    setSelectedDest(null)
                  }}
                  onFocus={() => setActiveInput('dest')}
                  className="flex-1 bg-transparent outline-none text-[14px] font-semibold placeholder:font-normal"
                  style={{ color: 'var(--text)', caretColor: '#8900F2' }}
                />
                {to && (
                  <button onClick={() => { setTo(''); setSelectedDest(null); }} className="active:scale-90 transition-transform">
                    <X size={14} style={{ color: 'var(--muted)' }} />
                  </button>
                )}
              </div>

              {/* Destination Autocomplete Dropdown */}
              {destSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-slate-950/95 border border-slate-900 rounded-2xl shadow-2xl max-h-48 overflow-y-auto z-40">
                  {destSuggestions.map((place) => (
                    <button
                      key={place.id}
                      onClick={() => {
                        setTo(place.place_name)
                        setSelectedDest({
                          name: place.place_name,
                          coordinates: place.geometry.coordinates,
                        })
                        setDestSuggestions([])
                      }}
                      className="w-full text-left px-4 py-3 text-xs text-slate-350 hover:bg-[#8900F2]/10 hover:text-white cursor-pointer border-b border-slate-900/60 last:border-b-0 font-medium"
                    >
                      {place.place_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Analyse Button */}
          <button
            onClick={handleAnalyse}
            disabled={!canAnalyse}
            className="w-full py-3.5 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2 mt-1 active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
            style={{
              background: canAnalyse
                ? 'linear-gradient(135deg, #8900F2 0%, #6B00C2 100%)'
                : 'rgba(137,0,242,0.08)',
              boxShadow: canAnalyse ? '0 4px 20px rgba(137,0,242,0.45)' : 'none',
              border: canAnalyse ? 'none' : '1px solid rgba(137,0,242,0.15)',
              color: canAnalyse ? '#FFF' : 'rgba(137,0,242,0.4)',
            }}
          >
            {loading ? <RefreshCw size={15} className="animate-spin text-[#8900F2]" /> : <ArrowRight size={16} />}
            <span>{loading ? 'Analyzing Route Vectors...' : 'Analyse Route'}</span>
          </button>
        </div>
      </div>

      {/* ── Bottom sheet for Results or Recent Destinations ── */}
      <div className="absolute bottom-[76px] left-0 right-0 z-10 px-4 pb-4">
        {loading && (
          <div className="glass rounded-3xl p-6 text-center slide-up flex flex-col items-center justify-center gap-3">
            <RefreshCw size={24} className="animate-spin text-[#8900F2]" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Evaluating Route Risks & Guidelines...</p>
          </div>
        )}

        {error && !loading && (
          <div className="glass rounded-3xl p-5 slide-up flex items-start gap-3" style={{ border: '1px solid rgba(239,68,68,0.25)' }}>
            <AlertTriangle size={18} className="text-[#EF4444] mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-[13px] text-[#EF4444]">Route Analysis Failed</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">{error}</p>
            </div>
          </div>
        )}

        {/* Route Details Panel */}
        {activeRoute && !loading && !error && (
          <div className="glass-strong rounded-3xl p-4 slide-up space-y-4">
            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2 rounded-2xl bg-[#8900F2]/10 border border-[#8900F2]/15">
                <span className="block font-black text-lg text-white">{activeRoute.distanceKm}</span>
                <span className="text-[9px] font-bold text-slate-450 tracking-wider uppercase">Distance (KM)</span>
              </div>
              <div className="p-2 rounded-2xl bg-[#8900F2]/10 border border-[#8900F2]/15">
                <span className="block font-black text-lg text-white">{activeRoute.durationMinutes}</span>
                <span className="text-[9px] font-bold text-slate-450 tracking-wider uppercase">Duration (MIN)</span>
              </div>
              <div
                className="p-2 rounded-2xl border"
                style={{
                  background: activeRoute.riskCategory === 'Low' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                  borderColor: activeRoute.riskCategory === 'Low' ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)',
                }}
              >
                <span
                  className="block font-black text-lg"
                  style={{ color: activeRoute.riskCategory === 'Low' ? '#22C55E' : '#F59E0B' }}
                >
                  {activeRoute.riskScore}%
                </span>
                <span className="text-[9px] font-bold text-slate-450 tracking-wider uppercase">Risk Score</span>
              </div>
            </div>

            {/* Route Intelligence Card (Step 8) */}
            <div 
              className="p-4 rounded-2xl text-left bg-purple-500/5 border border-purple-500/10 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-900/60 pb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-[#8900F2]" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-350">Route Aware Intelligence</span>
                </div>
                <span 
                  className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider"
                  style={{
                    background: activeRoute.riskCategory === 'Low' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                    color: activeRoute.riskCategory === 'Low' ? '#22C55E' : '#F59E0B'
                  }}
                >
                  {activeRoute.riskCategory} Risk
                </span>
              </div>

              {/* Zone counts grid */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-900">
                  <span className="block font-black text-sm text-slate-200">
                    {activeRoute.routeIntelligence?.nearbySchools?.length || 0}
                  </span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Schools</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-900">
                  <span className="block font-black text-sm text-slate-200">
                    {activeRoute.routeIntelligence?.nearbyHospitals?.length || 0}
                  </span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Hospitals</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-900">
                  <span className="block font-black text-sm text-slate-200">
                    {activeRoute.routeIntelligence?.nearbyAccidents?.length || 0}
                  </span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Accidents</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-900">
                  <span className="block font-black text-sm text-slate-200">
                    {activeRoute.routeIntelligence?.nearbySpeeds?.length || 0}
                  </span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Speeds</span>
                </div>
              </div>

              {/* Safety Recommendations */}
              {((activeRoute.recommendations && activeRoute.recommendations.length > 0) || 
                (activeRoute.routeIntelligence?.nearbySchools?.length > 0) || 
                (activeRoute.routeIntelligence?.nearbyAccidents?.length > 0)) && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[9px] font-black tracking-wider uppercase text-purple-400 block">Safety Protocol Recommendations</span>
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                    {activeRoute.recommendations && activeRoute.recommendations.map((rec, i) => (
                      <div key={i} className="text-[10px] text-slate-400 leading-normal flex items-start gap-1.5">
                        <span className="text-[#8900F2]">•</span>
                        <span><strong>{rec.title || 'Guideline'}:</strong> {rec.description}</span>
                      </div>
                    ))}
                    {activeRoute.routeIntelligence?.nearbySchools?.length > 0 && (
                      <div className="text-[10px] text-amber-500 leading-normal flex items-start gap-1.5">
                        <span>⚠️</span>
                        <span><strong>School Warning:</strong> School zones detected. Restrict speed to 30km/h and watch for child crossings.</span>
                      </div>
                    )}
                    {activeRoute.routeIntelligence?.nearbyAccidents?.length > 0 && (
                      <div className="text-[10px] text-red-500 leading-normal flex items-start gap-1.5">
                        <span>⚠️</span>
                        <span><strong>High Alert:</strong> Accident-prone segments nearby. Maintain high following distance.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveRoute(null)}
                className="px-4 py-4 rounded-2xl font-bold text-xs border border-slate-800 text-slate-400 active:scale-95 transition-transform"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  try {
                    sessionStorage.setItem('active_planned_route', JSON.stringify(activeRoute))
                  } catch (e) {
                    console.warn('[PlanTrip] Failed to cache active route in sessionStorage:', e)
                  }
                  navigate('/driving-mode', { state: { activeRoute } })
                }}
                className="flex-1 py-4 rounded-2xl font-black text-xs tracking-wider text-center text-white active:scale-97 transition-transform flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #8900F2 0%, #6B00C2 100%)',
                  boxShadow: '0 4px 16px rgba(137,0,242,0.4)',
                }}
              >
                <Navigation size={13} fill="currentColor" />
                START DRIVING
              </button>
            </div>
          </div>
        )}

        {/* Default Recent Destinations */}
        {!activeRoute && !loading && !error && (
          <div className="glass rounded-3xl p-4 slide-up">
            <p className="text-[11px] font-black uppercase tracking-[0.15em] mb-3"
               style={{ color: '#8900F2' }}>
              Recent Destinations
            </p>
            <div className="space-y-3">
              {[
                { name: 'Chennai Central', sub: '328 km · ~5h 20m' },
                { name: 'Madurai Airport', sub: '141 km · ~2h 35m' },
                { name: 'Tiruppur SIPCOT', sub: '38 km · ~48m' },
              ].map((dest) => (
                <button
                  key={dest.name}
                  onClick={() => {
                    setTo(dest.name)
                    setSelectedDest(null)
                  }}
                  className="w-full flex items-center gap-3 active:opacity-70 transition-opacity"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                       style={{ background: 'rgba(137,0,242,0.12)' }}>
                    <MapPin size={14} style={{ color: '#8900F2' }} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{dest.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--muted)' }}>{dest.sub}</p>
                  </div>
                  <ArrowRight size={14} style={{ color: 'rgba(137,0,242,0.4)' }} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
