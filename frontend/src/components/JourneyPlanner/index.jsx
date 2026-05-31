import React, { useState, useEffect, useRef } from 'react'
import { Navigation, Play, RefreshCw, MapPin } from 'lucide-react'
import { fetchPlaceSuggestions } from '../../services/orsService'

export default function JourneyPlanner({ onAnalyze, loading }) {
  const [sourceInput, setSourceInput] = useState('')
  const [destInput, setDestInput] = useState('')
  
  const [sourceSuggestions, setSourceSuggestions] = useState([])
  const [destSuggestions, setDestSuggestions] = useState([])

  const [selectedSource, setSelectedSource] = useState(null) // { name, coordinates: [lng, lat] }
  const [selectedDest, setSelectedDest] = useState(null) // { name, coordinates: [lng, lat] }

  const [activeInput, setActiveInput] = useState(null) // 'source' or 'dest'

  const sourceRef = useRef(null)
  const destRef = useRef(null)

  // Fetch source suggestions
  useEffect(() => {
    let active = true
    if (activeInput !== 'source' || sourceInput.trim().length < 3) {
      setSourceSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      const results = await fetchPlaceSuggestions(sourceInput)
      if (active) {
        setSourceSuggestions(results)
      }
    }, 300)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [sourceInput, activeInput])

  // Fetch destination suggestions
  useEffect(() => {
    let active = true
    if (activeInput !== 'dest' || destInput.trim().length < 3) {
      setDestSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      const results = await fetchPlaceSuggestions(destInput)
      if (active) {
        setDestSuggestions(results)
      }
    }, 300)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [destInput, activeInput])

  // Click outside to close dropdowns
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

  function handleSubmit(e) {
    e.preventDefault()
    if (!selectedSource || !selectedDest) return

    if (onAnalyze) {
      onAnalyze({
        source: selectedSource,
        destination: selectedDest,
      })
    }
  }

  return (
    <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 relative z-30">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
          <Navigation size={16} />
        </div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Journey Preparation</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Source Location */}
          <div className="relative" ref={sourceRef}>
            <label htmlFor="planner-source" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Source Location
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-550">
                <MapPin size={13} />
              </span>
              <input
                id="planner-source"
                type="text"
                value={sourceInput}
                onChange={(e) => {
                  setSourceInput(e.target.value)
                  setSelectedSource(null) // Reset selection if typing
                }}
                onFocus={() => setActiveInput('source')}
                disabled={loading}
                autoComplete="off"
                placeholder="Search starting address..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-900 bg-black/40 text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
              />
            </div>

            {/* Source Autocomplete Dropdown */}
            {sourceSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-slate-950 border border-slate-900 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-40">
                {sourceSuggestions.map((place) => (
                  <div
                    key={place.id}
                    onClick={() => {
                      setSourceInput(place.place_name)
                      setSelectedSource({
                        name: place.place_name,
                        coordinates: place.geometry.coordinates, // [lng, lat]
                      })
                      setSourceSuggestions([])
                    }}
                    className="px-3.5 py-2.5 text-left text-xs text-slate-350 hover:bg-slate-900 hover:text-white cursor-pointer border-b border-slate-900 last:border-b-0"
                  >
                    {place.place_name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Destination Location */}
          <div className="relative" ref={destRef}>
            <label htmlFor="planner-destination" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Destination Location
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-550">
                <MapPin size={13} />
              </span>
              <input
                id="planner-destination"
                type="text"
                value={destInput}
                onChange={(e) => {
                  setDestInput(e.target.value)
                  setSelectedDest(null) // Reset selection if typing
                }}
                onFocus={() => setActiveInput('dest')}
                disabled={loading}
                autoComplete="off"
                placeholder="Search destination address..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-900 bg-black/40 text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
              />
            </div>

            {/* Destination Autocomplete Dropdown */}
            {destSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-slate-950 border border-slate-900 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-40">
                {destSuggestions.map((place) => (
                  <div
                    key={place.id}
                    onClick={() => {
                      setDestInput(place.place_name)
                      setSelectedDest({
                        name: place.place_name,
                        coordinates: place.geometry.coordinates, // [lng, lat]
                      })
                      setDestSuggestions([])
                    }}
                    className="px-3.5 py-2.5 text-left text-xs text-slate-350 hover:bg-slate-900 hover:text-white cursor-pointer border-b border-slate-900 last:border-b-0"
                  >
                    {place.place_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !selectedSource || !selectedDest}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs px-5 py-2.5 transition-all disabled:opacity-40 cursor-pointer"
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
            <span>{loading ? 'Analyzing Route...' : 'Analyze Journey'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
