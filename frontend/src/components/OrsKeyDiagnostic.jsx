import React, { useState } from 'react'
import { AlertCircle, Key, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react'

export default function OrsKeyDiagnostic() {
  const [keyInput, setKeyInput] = useState('')
  const [success, setSuccess] = useState(false)

  function handleSave(e) {
    e.preventDefault()
    const trimmed = keyInput.trim()
    if (trimmed.length > 10) {
      localStorage.setItem('VITE_ORS_API_KEY', trimmed)
      setSuccess(true)
      setTimeout(() => {
        window.location.reload()
      }, 1200)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-red-950/20 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-amber-950/20 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-lg bg-slate-900/40 border border-red-500/20 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-red-950/50 text-red-500 rounded-2xl border border-red-500/30">
            <AlertCircle size={32} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Missing API Key Configuration</h1>
            <p className="text-xs text-slate-400 mt-1">OpenRouteService API Integration Required</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed border-y border-slate-800/80 py-5 my-5">
          <p>
            DriveLegal AI has migrated completely from Mapbox to <strong className="text-white">OpenRouteService (ORS)</strong>. 
            To activate journey planning, route analysis, and GIS operations, an ORS API key must be supplied.
          </p>
          <div className="bg-black/40 border border-slate-800 rounded-2xl p-4 space-y-2 mt-2">
            <p className="font-semibold text-white mb-1">How to configure:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>Create an account at <a href="https://openrouteservice.org" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">openrouteservice.org</a>.</li>
              <li>Generate a free API key in your dashboard.</li>
              <li>Add the key in the frontend environment:</li>
            </ol>
            <div className="bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-900 font-mono text-[10px] text-red-400 select-all mt-2">
              VITE_ORS_API_KEY=your_openrouteservice_key_here
            </div>
          </div>
        </div>

        {!success ? (
          <form onSubmit={handleSave} className="space-y-3.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Provide Key Instantly (Saves to LocalStorage)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-500">
                <Key size={14} />
              </span>
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Enter OpenRouteService API key..."
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-850 bg-black/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-red-500/40"
              />
            </div>
            <button
              type="submit"
              disabled={keyInput.trim().length <= 10}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs py-3 transition-all disabled:opacity-40 cursor-pointer"
            >
              <span>Activate Service</span>
              <ArrowRight size={13} />
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-emerald-400 animate-pulse space-y-2">
            <CheckCircle2 size={40} />
            <span className="text-xs font-semibold">Key Registered! Reloading services...</span>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center gap-2 text-[10px] text-slate-500">
        <ShieldCheck size={12} />
        <span>DriveLegal AI Sandbox System Security Diagnostics</span>
      </div>
    </div>
  )
}
