import { Car, Mail, MapPin } from 'lucide-react'
import { footerLinks } from '../data/landingData'

function Footer() {
  return (
    <footer className="border-t border-white/30 bg-white/70 py-12 dark:border-slate-800 dark:bg-slate-950/80">
      <div className="section-shell grid gap-10 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <div className="inline-flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white">
              <Car size={18} aria-hidden="true" />
            </span>
            <span className="text-base font-semibold text-slate-900 dark:text-white">
              DriveLegal AI
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Next-generation driving intelligence platform helping drivers and fleets stay compliant, protected, and confidently on track.
          </p>
          <div className="mt-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <p className="inline-flex items-center gap-2">
              <Mail size={15} aria-hidden="true" />
              support@drivelegal.ai
            </p>
            <p className="inline-flex items-center gap-2">
              <MapPin size={15} aria-hidden="true" />
              Bengaluru, India
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {footerLinks.map((group) => (
            <div key={group.heading}>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {group.heading}
              </h3>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      tabIndex={0}
                      className="text-sm text-slate-600 transition hover:text-sky-700 dark:text-slate-300 dark:hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/30 rounded"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="section-shell mt-10 border-t border-slate-200/70 pt-6 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        © {new Date().getFullYear()} DriveLegal AI. All rights reserved.
      </div>
    </footer>
  )
}

export default Footer
