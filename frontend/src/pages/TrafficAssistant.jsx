import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, ChevronRight, Search, ShieldCheck, AlertCircle, Hash, X, Clock, HelpCircle, RefreshCw, Bot
} from 'lucide-react'
import { searchTrafficRules } from '../services/rulesService'
import toast from 'react-hot-toast'

const POPULAR_CATEGORIES = [
  { id: 'all',           label: 'All Rules' },
  { id: 'safety',        label: 'Safety' },
  { id: 'documentation', label: 'Documentation' },
  { id: 'speed',         label: 'Speed' },
  { id: 'driving',       label: 'Driving' },
]

const QUICK_ACTIONS = [
  { term: 'Helmet',     label: '🏍️ Helmet Penalty' },
  { term: 'Seat belt',  label: '🚗 Seat Belt Rules' },
  { term: 'License',    label: '📁 License Fine' },
  { term: 'Speed limit',label: '⚡ Speeding Violations' },
]

export default function TrafficAssistant() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState([])

  // Load recent searches on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recent_rules_searches')
      if (stored) {
        setRecentSearches(JSON.parse(stored))
      }
    } catch (e) {
      console.warn('Failed to parse recent searches:', e)
    }
  }, [])

  // Initial search load (to populate empty state with standard rules)
  useEffect(() => {
    executeSearch('', selectedCategory)
  }, [selectedCategory])

  const saveRecentSearch = (term) => {
    if (!term || term.trim() === '') return
    const cleanTerm = term.trim()
    
    setRecentSearches(prev => {
      const filtered = prev.filter(t => t.toLowerCase() !== cleanTerm.toLowerCase())
      const updated = [cleanTerm, ...filtered].slice(0, 5) // cap at 5 terms
      localStorage.setItem('recent_rules_searches', JSON.stringify(updated))
      return updated
    })
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('recent_rules_searches')
    toast.success('Search history cleared')
  }

  const executeSearch = async (searchTerm, cat = 'all') => {
    setLoading(true)
    try {
      const results = await searchTrafficRules(searchTerm, cat)
      setRules(results)
      if (searchTerm) {
        saveRecentSearch(searchTerm)
      }
    } catch (err) {
      console.error('Search failed:', err)
      toast.error('Failed to search traffic rules')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault()
    executeSearch(query, selectedCategory)
  }

  const handleQuickAction = (term) => {
    setQuery(term)
    executeSearch(term, selectedCategory)
  }

  const handleRemoveRecent = (e, termToRemove) => {
    e.stopPropagation()
    setRecentSearches(prev => {
      const updated = prev.filter(t => t !== termToRemove)
      localStorage.setItem('recent_rules_searches', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <div
      className="min-h-[100dvh] pb-[80px] overflow-y-auto scrollbar-hide"
      style={{ background: 'var(--bg)' }}
    >
      {/* Header */}
      <div
        className="pt-14 px-5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(137,0,242,0.06), transparent)' }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center bg-purple-500/10 border border-purple-500/20"
            style={{ boxShadow: '0 0 20px rgba(137,0,242,0.4)' }}
          >
            <Zap size={20} style={{ color: '#8900F2' }} />
          </div>
          <div>
            <p className="font-black text-[18px]" style={{ color: 'var(--text)' }}>RTO Assistant</p>
            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Motor Vehicles Act 1988 Reference</p>
          </div>
        </div>
      </div>

      {/* AI Assistant Chat Banner Card */}
      <div className="px-5 mb-5">
        <div
          onClick={() => navigate('/traffic-assistant-chat')}
          className="rounded-3xl p-5 relative overflow-hidden flex items-center justify-between gap-4 cursor-pointer hover:bg-white/5 border border-purple-500/30 active:scale-[0.99] transition-all bg-gradient-to-r from-purple-900/20 via-indigo-950/20 to-slate-950/30"
          style={{
            boxShadow: '0 8px 32px rgba(137,0,242,0.1)',
          }}
        >
          {/* Neon Glow Overlay */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[30px] pointer-events-none" />
          
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-purple-500 text-white shadow-[0_0_15px_rgba(137,0,242,0.5)] flex-shrink-0">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-100 flex items-center gap-1.5 flex-wrap">
                AI Traffic Assistant
                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[8px] font-bold uppercase tracking-widest border border-purple-500/30 animate-pulse">
                  NEW
                </span>
              </h3>
              <p className="text-[10px] text-slate-450 font-semibold mt-1">
                Ask about traffic rules, vehicle compliance, or driver trust score.
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-purple-400 flex-shrink-0" />
        </div>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="px-5 mb-5">
        <div
          className="flex items-center gap-3 px-4 py-4 rounded-3xl"
          style={{
            background: 'rgba(15,17,23,0.9)',
            border: '1px solid rgba(137,0,242,0.22)',
            boxShadow: '0 4px 20px rgba(137,0,242,0.08)',
          }}
        >
          <Search size={18} style={{ color: '#8900F2' }} />
          <input
            type="text"
            placeholder="Search rules, sections, fines…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[14px] font-medium"
            style={{ color: 'var(--text)', caretColor: '#8900F2' }}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                executeSearch('', selectedCategory)
              }}
              className="w-6 h-6 rounded-lg flex items-center justify-center bg-slate-900 border border-slate-800"
            >
              <X size={12} className="text-slate-400" />
            </button>
          )}
          <button
            type="submit"
            className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform bg-purple-500/10 border border-purple-500/30"
          >
            <ChevronRight size={16} style={{ color: '#8900F2' }} />
          </button>
        </div>
      </form>

      {/* Category Scrollbar */}
      <div className="px-5 mb-6 flex gap-2 overflow-x-auto scrollbar-hide select-none pb-1">
        {POPULAR_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex-shrink-0"
              style={{
                background: isActive ? '#8900F2' : 'rgba(137,0,242,0.05)',
                border: `1px solid ${isActive ? '#8900F2' : 'rgba(137,0,242,0.15)'}`,
                color: isActive ? '#FFF' : 'var(--muted)',
                boxShadow: isActive ? '0 4px 12px rgba(137,0,242,0.3)' : 'none',
              }}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Quick Action Chips */}
      <div className="px-5 mb-6">
        <p className="text-[9px] font-black tracking-[0.18em] uppercase text-purple-400 mb-2.5">
          Common Violated Rules
        </p>
        <div className="flex gap-2.5 flex-wrap">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.term}
              onClick={() => handleQuickAction(qa.term)}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-900 text-slate-350 text-[11px] font-semibold active:scale-95 transition-transform"
            >
              {qa.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div className="px-5 mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black tracking-[0.18em] uppercase text-purple-400">
              Recent Inquiries
            </span>
            <button 
              onClick={clearRecentSearches}
              className="text-[9px] font-black tracking-wide uppercase text-red-500/80 active:scale-90 transition-transform"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1.5">
            {recentSearches.map((term, i) => (
              <div
                key={i}
                onClick={() => handleQuickAction(term)}
                className="flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-950/60 border border-slate-900 text-xs font-semibold text-slate-300 hover:text-[#8900F2] active:scale-98 transition-transform cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-slate-500" />
                  <span>{term}</span>
                </div>
                <button 
                  onClick={(e) => handleRemoveRecent(e, term)}
                  className="w-5 h-5 rounded-md flex items-center justify-center bg-slate-900 border border-slate-800 hover:text-red-500"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Container */}
      <div className="px-5 space-y-4">
        <p className="text-[9px] font-black tracking-[0.18em] uppercase text-purple-400">
          Rules Reference ({rules.length})
        </p>

        {loading ? (
          <div className="text-center py-12 text-slate-500 font-semibold text-xs flex flex-col items-center gap-2">
            <RefreshCw size={22} className="animate-spin text-purple-500" />
            <span>Scanning Legal Database...</span>
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-14 rounded-3xl bg-slate-950 border border-slate-900 text-slate-500 text-xs font-semibold px-6 leading-relaxed flex flex-col items-center gap-2.5">
            <HelpCircle size={22} className="text-purple-500/60" />
            <span>No rules found matching &quot;{query}&quot; under the selected category. Try another inquiry.</span>
          </div>
        ) : (
          rules.map((rule, idx) => {
            const hasHeavyFine = Number(rule.fineAmount) >= 5000
            const fineColor = hasHeavyFine ? '#EF4444' : '#22C55E'

            return (
              <div
                key={rule.id || idx}
                className="rounded-3xl p-5 slide-up relative overflow-hidden flex flex-col gap-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(20,25,35,0.95), rgba(12,14,20,0.95))',
                  border: '1px solid rgba(137,0,242,0.18)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
              >
                {/* Stripe */}
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl bg-gradient-to-b from-purple-500 to-transparent" />

                {/* Top Header Row */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span 
                      className="px-2 py-0.5 rounded-md text-[8px] font-black tracking-wider uppercase"
                      style={{
                        background: 'rgba(137,0,242,0.12)',
                        color: '#8900F2',
                        border: '1px solid rgba(137,0,242,0.22)'
                      }}
                    >
                      {rule.category || 'General'}
                    </span>
                    <h3 className="font-black text-[15px] text-slate-200 mt-1.5 leading-snug">{rule.title}</h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                      <Hash size={10} />
                      {rule.sectionReference || 'MVA'}
                    </p>
                  </div>
                </div>

                {/* Body Explanation */}
                <p className="text-[12px] text-slate-350 leading-relaxed pr-1">
                  {rule.description}
                </p>

                {/* Footer Fine Row */}
                <div 
                  className="flex items-center justify-between pt-3 border-t border-slate-900/60"
                >
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Fine / Penalty</span>
                  <span 
                    className="font-black text-[18px] tracking-wide"
                    style={{ 
                      color: fineColor,
                      textShadow: `0 0 10px ${fineColor}20` 
                    }}
                  >
                    ₹{rule.fineAmount ? rule.fineAmount.toLocaleString('en-IN') : '0'}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Disclaimer */}
      <div className="px-5 mt-6 mb-4">
        <div
          className="px-4 py-3 rounded-2xl flex items-start gap-2"
          style={{ background: 'rgba(137,0,242,0.04)', border: '1px solid rgba(137,0,242,0.10)' }}
        >
          <Hash size={12} className="text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-slate-500">
            Powered by RTO Motor Vehicles Act 1988 records. Caching optimized for speed. Always prioritize road safety.
          </p>
        </div>
      </div>
    </div>
  )
}
