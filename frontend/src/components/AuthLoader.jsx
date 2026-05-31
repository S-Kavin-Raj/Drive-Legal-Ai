import React from 'react'

export default function AuthLoader({ message = 'Verifying session…' }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass p-6 rounded-xl shadow-md flex items-center gap-4">
        <svg className="w-6 h-6 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4" />
          <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <div className="text-sm text-slate-600 dark:text-slate-200">{message}</div>
      </div>
    </div>
  )
}
