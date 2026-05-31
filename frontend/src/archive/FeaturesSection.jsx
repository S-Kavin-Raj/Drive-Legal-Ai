import { featureItems } from '../data/landingData'

function FeaturesSection() {
  return (
    <section id="features" className="section-shell pb-14 sm:pb-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="section-title">Built for Real-World Driving Challenges</h2>
        <p className="section-subtitle">
          Every feature is designed to reduce road risk, speed up legal support, and deliver a premium AI startup experience across devices.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featureItems.map((feature, index) => {
          const Icon = feature.icon

          return (
            <article
              key={feature.title}
              tabIndex={0}
              role="article"
              aria-labelledby={`feature-${index}`}
              className="glass group rounded-2xl p-5 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/30"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="mb-4 inline-flex h-11 w-11 animate-float items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                <Icon size={20} aria-hidden="true" />
              </div>
              <h3 id={`feature-${index}`} className="text-lg font-semibold text-slate-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {feature.description}
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default FeaturesSection
