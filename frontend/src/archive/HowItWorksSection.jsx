import { workflowSteps } from '../data/landingData'

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="section-shell pb-14 sm:pb-20">
      <div className="glass rounded-3xl p-7 sm:p-10">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">
            DriveLegal AI transforms live driving data into practical safety and legal decisions in three simple steps.
          </p>
        </div>

        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {workflowSteps.map((step, i) => {
            const Icon = step.icon

            return (
              <article
                key={step.title}
                tabIndex={0}
                role="article"
                aria-labelledby={`work-${i}`}
                className="rounded-2xl border border-white/40 bg-white/70 p-5 text-left dark:border-slate-700 dark:bg-slate-900/70 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/30"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                  <span>{step.step}</span>
                </div>
                <div className="mt-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                  <Icon size={18} aria-hidden="true" />
                </div>
                <h3 id={`work-${i}`} className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {step.description}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default HowItWorksSection
