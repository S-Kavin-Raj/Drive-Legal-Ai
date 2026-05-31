import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Profile() {
  const { user, role } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-[#0A0F1C]">
      <div className="section-shell max-w-3xl">
        <div className="glass rounded-3xl p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700 dark:text-sky-300">Profile</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Account overview</h1>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-xs uppercase tracking-widest text-slate-500">Email</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{user?.email || 'Not available'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-xs uppercase tracking-widest text-slate-500">Role</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{role || 'user'}</p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/dashboard" className="inline-flex rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500">
              Back to Dashboard
            </Link>
            <Link to="/settings" className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
              Open Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}