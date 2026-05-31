import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Shield } from 'lucide-react'

export default function SplashScreen() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!loading && minTimeElapsed) {
      if (user) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    }
  }, [loading, minTimeElapsed, user, navigate])

  return (
    <div
      className="flex flex-col items-center justify-center h-[100dvh] w-full relative overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* Background ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(137,0,242,0.18) 0%, transparent 60%)',
        }}
      />

      <div className="flex flex-col items-center gap-4 z-10 slide-up">
        {/* Brand Icon with Neon Glow */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center glow-purple"
          style={{
            background: 'linear-gradient(135deg, #8900F2 0%, #6B00C2 100%)',
            border: '1px solid rgba(137,0,242,0.4)',
          }}
        >
          <Shield size={40} className="text-white fill-white/10" />
        </div>

        {/* Brand Name */}
        <div className="text-center mt-2">
          <h1
            className="font-black text-3xl tracking-wider text-glow-purple animate-pulse"
            style={{ color: 'var(--text)' }}
          >
            DRIVELEGAL AI
          </h1>
          <p
            className="text-xs font-semibold uppercase tracking-[0.3em] mt-1"
            style={{ color: '#8900F2' }}
          >
            Compliance Assistant
          </p>
        </div>
      </div>

      {/* Loading indicator at the bottom */}
      <div className="absolute bottom-16 flex flex-col items-center gap-2 z-10">
        <div 
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ 
            borderColor: 'var(--purple) transparent transparent transparent',
            borderTopColor: '#8900F2' 
          }} 
        />
      </div>
    </div>
  )
}
