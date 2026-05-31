import { FileSearch, ShieldCheck, TrendingUp, Users } from 'lucide-react'
import { statItems } from '../data/landingData'

const statIcons = [TrendingUp, Users, ShieldCheck, FileSearch]

function StatsSection() {
  return (
    <section id="stats" className="section-shell pb-16 sm:pb-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="section-title">Trusted Performance Metrics</h2>
        <p className="section-subtitle">
          A quick view into how AI-powered legal driving assistance creates measurable impact.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statItems.map((item, index) => {
          const Icon = statIcons[index % statIcons.length]

          return (
            <article
              key={item.label}
              tabIndex={0}
              role="article"
              aria-labelledby={`stat-${index}`}
              className="glass rounded-2xl p-5 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200/30"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                <Icon size={18} aria-hidden="true" />
              </div>
              <p id={`stat-${index}`} className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {item.value}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                {item.label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {item.note}
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default StatsSection
