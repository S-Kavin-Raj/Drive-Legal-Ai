import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Unauthorized() {
  const nav = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass p-8 rounded-xl text-center max-w-md">
        <h2 className="text-xl font-semibold mb-2">Access denied</h2>
        <p className="text-sm text-slate-600 mb-6">You do not have permission to view this page.</p>
        <div className="flex justify-center gap-3">
          <button onClick={() => nav(-1)} className="px-4 py-2 rounded bg-slate-100 dark:bg-slate-700">Go back</button>
          <button onClick={() => nav('/')} className="px-4 py-2 rounded bg-indigo-600 text-white">Home</button>
        </div>
      </div>
    </div>
  )
}
