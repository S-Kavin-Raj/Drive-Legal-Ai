import { ArrowRight, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { heroBadges } from '../data/landingData'

function HeroSection() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  function handleGetStarted() {
    navigate(user ? '/dashboard' : '/login')
  }

  return (
    <section className="section-shell relative pb-14 pt-16 sm:pb-20 sm:pt-24">
      <div className="glass relative overflow-hidden rounded-3xl p-7 sm:p-10 lg:p-14">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-sky-400/30 blur-2xl dark:bg-sky-600/20" />
        <div className="pointer-events-none absolute -bottom-24 left-0 h-56 w-56 animate-pulseGlow rounded-full bg-indigo-400/30 blur-3xl dark:bg-indigo-700/30" />

        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-200/70 bg-sky-100/70 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-sky-900 dark:border-sky-500/30 dark:bg-sky-900/40 dark:text-sky-200">
            <ShieldCheck size={14} aria-hidden="true" />
            AI-Powered Road Legal Safety Platform
          </span>

          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl leading-tight">
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 dark:from-sky-400 dark:via-indigo-400 dark:to-purple-400">
              Make Every Drive Smarter,
            </span>
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300">
              Safer and Legally Confident.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
            DriveLegal AI combines route intelligence, speed risk detection, and proactive legal guidance into one seamless experience for modern drivers and fleets.
          </p>

          <div className="mt-8 flex items-center justify-center">
            <button
              type="button"
              onClick={handleGetStarted}
              disabled={loading}
              aria-busy={loading}
              className="inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform duration-200 hover:-translate-y-1 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/40"
            >
              {loading ? 'Loading…' : user ? 'Go to Dashboard' : 'Get Started Free'}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>

          <ul className="mt-7 flex flex-wrap items-center justify-center gap-2">
            {heroBadges.map((badge) => (
              <li
                key={badge}
                className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300"
              >
                {badge}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
