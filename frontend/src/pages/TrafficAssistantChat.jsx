import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { sendChatMessage } from '../services/trafficAssistantService'
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import {
  Send, Bot, User, ArrowLeft, RefreshCw, HelpCircle, History, Sparkles, X, ChevronRight, Scale
} from 'lucide-react'
import toast from 'react-hot-toast'

const SUGGESTED_QUESTIONS = [
  { text: 'Why is my trust score low?', desc: 'Deconstruct safe driving sub-scores' },
  { text: 'What documents are required for my vehicle?', desc: 'Mandated MV Act credentials check' },
  { text: 'What happens if insurance expires?', desc: 'Fines, legal penalties, & liabilities' },
  { text: 'Explain my traffic challans.', desc: 'Review active outstanding violations' }
]

export default function TrafficAssistantChat() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [hasPrefilled, setHasPrefilled] = useState(false)

  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hello! I am your domain-restricted Gemini Traffic Assistant. Ask me anything about Indian traffic regulations, document vault compliance, outstanding citations, road hazards, or your driver trust score.',
      createdAt: new Date().toISOString()
    }
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState([])
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)

  const chatEndRef = useRef(null)

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (user?.uid) {
      loadHistory()
    }
  }, [user?.uid])

  useEffect(() => {
    if (location.state?.prefilledQuestion && !hasPrefilled) {
      setHasPrefilled(true)
      handleSend(location.state.prefilledQuestion)
    }
  }, [location.state, hasPrefilled])

  async function loadHistory() {
    if (!user?.uid) return
    setLoadingHistory(true)
    try {
      // In-memory sort fallback to prevent index issues in offline/mock databases
      const ref = collection(db, 'assistantConversations')
      const q = query(ref, where('userId', '==', user.uid))
      const snap = await getDocs(q)
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setHistory(list.slice(0, 15))
    } catch (e) {
      console.warn('[TrafficAssistantChat] Failed to load chat history:', e.message)
    } finally {
      setLoadingHistory(false)
    }
  }

  async function handleSend(textToSend) {
    const question = (textToSend || input).trim()
    if (!question) return

    if (!textToSend) setInput('')
    setMessages(prev => [...prev, { sender: 'user', text: question, createdAt: new Date().toISOString() }])
    setSending(true)

    try {
      const res = await sendChatMessage(question)
      setMessages(prev => [...prev, { sender: 'assistant', text: res.answer, createdAt: new Date().toISOString() }])
      // Refresh historical logs list
      await loadHistory()
    } catch (err) {
      console.error(err)
      toast.error('Failed to communicate with Traffic Assistant.')
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: 'I encountered a connection error. Please try asking again. Ground MV Act rules remain valid.',
          createdAt: new Date().toISOString()
        }
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Background neon ambient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* ── Header ─────────────────────────────────── */}
      <header className="pt-12 px-5 pb-4 flex items-center justify-between z-10 glass border-b border-slate-900/60">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/traffic-assistant')}
            className="w-9 h-9 rounded-2xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: 'rgba(137,0,242,0.12)', border: '1px solid rgba(137,0,242,0.22)' }}
          >
            <ArrowLeft size={16} style={{ color: '#8900F2' }} />
          </button>
          <div>
            <h1 className="font-black text-[18px] leading-tight" style={{ color: 'var(--text)' }}>AI Traffic Assistant</h1>
            <p className="text-[10px] font-semibold text-slate-450 uppercase tracking-[0.1em] mt-0.5">Gemini Grounded Intelligence</p>
          </div>
        </div>

        {/* History button toggle */}
        <button
          onClick={() => setShowHistoryDrawer(true)}
          className="w-9 h-9 rounded-2xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <History size={16} className="text-slate-400" />
        </button>
      </header>

      {/* ── Conversational Body ────────────────────── */}
      <main className="flex-1 overflow-y-auto px-5 py-4 space-y-4 z-10 scrollbar-hide">
        {messages.map((m, idx) => {
          const isUser = m.sender === 'user'
          return (
            <div
              key={idx}
              className={`flex items-start gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse text-right' : 'mr-auto text-left'}`}
            >
              {/* Avatar indicator */}
              <div 
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isUser ? 'bg-purple-500/20 text-[#8900F2]' : 'bg-slate-900 border border-slate-800 text-purple-400'
                }`}
              >
                {isUser ? <User size={14} /> : <Bot size={14} />}
              </div>

              {/* Chat bubble body */}
              <div
                className={`p-3.5 rounded-2xl text-[12px] leading-relaxed font-medium ${
                  isUser 
                    ? 'bg-purple-500 text-white rounded-tr-none' 
                    : 'bg-[#131A22] border border-white/5 text-slate-200 rounded-tl-none'
                }`}
                style={{
                  boxShadow: isUser ? '0 4px 16px rgba(137,0,242,0.2)' : 'none'
                }}
              >
                {m.text}
              </div>
            </div>
          )
        })}

        {/* Typing Loader Indicator */}
        {sending && (
          <div className="flex items-start gap-3 max-w-[85%] mr-auto text-left">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-900 border border-slate-800 text-purple-400 flex-shrink-0">
              <Bot size={14} />
            </div>
            <div className="p-3.5 rounded-2xl bg-[#131A22] border border-white/5 text-slate-200 rounded-tl-none flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />

        {/* Suggestion cards row (Shown only if conversational stream is pristine) */}
        {messages.length === 1 && !sending && (
          <div className="pt-6 space-y-3 animate-fadeIn">
            <div className="flex items-center gap-1.5 px-1">
              <Sparkles size={12} className="text-purple-400" />
              <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">Suggested Prompts</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {SUGGESTED_QUESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(item.text)}
                  className="w-full p-3.5 rounded-2xl text-left glass hover:bg-white/5 active:scale-[0.99] border border-white/5 transition-all flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-bold text-[12px] text-slate-200">{item.text}</p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{item.desc}</p>
                  </div>
                  <ChevronRight size={14} className="text-purple-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Quick Actions Footer ──────────────────── */}
      {messages.length === 1 && !sending && (
        <div className="px-5 pb-3 pt-2 z-10 flex gap-2 overflow-x-auto scrollbar-hide flex-shrink-0 border-t border-slate-900/60">
          <button 
            onClick={() => navigate('/document-vault')}
            className="flex-shrink-0 px-3.5 py-2 bg-purple-500/5 border border-purple-500/15 text-purple-300 rounded-xl text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-transform"
          >
            📁 Vault Status
          </button>
          <button 
            onClick={() => navigate('/challan-manager')}
            className="flex-shrink-0 px-3.5 py-2 bg-purple-500/5 border border-purple-500/15 text-purple-300 rounded-xl text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-transform"
          >
            💳 Challan Ledger
          </button>
          <button 
            onClick={() => navigate('/settings')}
            className="flex-shrink-0 px-3.5 py-2 bg-purple-500/5 border border-purple-500/15 text-purple-300 rounded-xl text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-transform"
          >
            ⚙️ App Settings
          </button>
        </div>
      )}

      {/* ── Message Input Bar ─────────────────────── */}
      <footer className="p-4 z-10 border-t border-slate-900/60 glass flex-shrink-0 pb-7">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex items-center gap-2 bg-slate-950/80 border border-white/5 rounded-2xl p-1.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={sending ? 'Awaiting response...' : 'Ask about rules, scores, or challans...'}
            disabled={sending}
            className="flex-1 bg-transparent px-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#8900F2] text-white active:scale-90 disabled:opacity-30 disabled:scale-100 transition-transform"
          >
            <Send size={13} fill="currentColor" />
          </button>
        </form>
      </footer>

      {/* ── Historical Conversations Drawer ───────── */}
      {showHistoryDrawer && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full glass-strong rounded-t-[32px] p-6 pb-10 space-y-4 slide-up max-w-[440px] mx-auto border-t border-purple-500/20 shadow-2xl flex flex-col h-[75dvh]">
            {/* Handle bar */}
            <div className="flex justify-center -mt-2 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-800" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-900/60 flex-shrink-0">
              <div>
                <h2 className="font-black text-[16px] text-slate-200">Chat History</h2>
                <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5">Recent Assistant Prompts</p>
              </div>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-900 border border-slate-800 active:scale-90 transition-transform"
              >
                <X size={14} className="text-slate-400" />
              </button>
            </div>

            {/* Scrollable history items */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-left">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-500">
                  <RefreshCw size={20} className="animate-spin text-purple-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Loading History...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-24 text-slate-500">
                  <HelpCircle size={28} className="mx-auto text-slate-700 mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No chat logs</p>
                  <p className="text-[9px] text-[#94A3B8] mt-0.5">Your conversation history will appear here.</p>
                </div>
              ) : (
                history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      // Seed conversation thread with history item
                      setMessages([
                        { sender: 'user', text: item.question, createdAt: item.createdAt },
                        { sender: 'assistant', text: item.answer, createdAt: item.createdAt }
                      ])
                      setShowHistoryDrawer(false)
                    }}
                    className="w-full p-3.5 rounded-2xl bg-[#131A22] border border-white/5 text-left active:scale-[0.99] transition-transform hover:border-purple-500/20 block"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[11px] font-bold text-slate-200 line-clamp-1 leading-tight flex-1">
                        {item.question}
                      </p>
                      <ChevronRight size={12} className="text-slate-500 flex-shrink-0 mt-0.5" />
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2 mt-1.5 leading-normal">
                      {item.answer}
                    </p>
                    <span className="text-[8px] font-semibold text-slate-500 block mt-2">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
