import { Car, LogIn, Menu, MoonStar, SunMedium, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { navLinks } from '../data/landingData'
import { useAuth } from '../hooks/useAuth'

function Navbar({ theme, onToggleTheme }) {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const navItemClasses =
    'text-sm font-medium text-slate-700 transition hover:text-sky-700 dark:text-slate-200 dark:hover:text-sky-300'

  return (
    <header className="sticky top-0 z-50 border-b border-white/30 bg-slate-50/70 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/60">
      <nav
        className="section-shell flex h-20 items-center justify-between"
        aria-label="Primary"
      >
          <Link to="/" className="inline-flex items-center gap-2" aria-label="DriveLegal AI home">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white shadow-lg shadow-sky-500/30">
            <Car size={18} aria-hidden="true" />
          </span>
          <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            DriveLegal AI
          </span>
          </Link>

        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((item) => (
            <a key={item.label} href={item.href} className={navItemClasses}>
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle color mode"
            className="glass inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:scale-105 hover:text-sky-700 dark:text-slate-200 dark:hover:text-sky-300"
          >
            {theme === 'dark' ? <SunMedium size={17} /> : <MoonStar size={17} />}
          </button>
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200/60 dark:text-slate-200 dark:hover:bg-slate-800/70"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await logout()
                  navigate('/')
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200/60 dark:text-slate-200 dark:hover:bg-slate-800/70"
              >
                <LogIn size={16} aria-hidden="true" />
                Login
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
              >
                <UserPlus size={16} aria-hidden="true" />
                Signup
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle color mode"
            className="glass inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 dark:text-slate-200"
          >
            {theme === 'dark' ? <SunMedium size={17} /> : <MoonStar size={17} />}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            aria-label="Toggle navigation menu"
            aria-expanded={isOpen}
            className="glass inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 dark:text-slate-200"
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {isOpen && (
        <div className="section-shell pb-4 md:hidden">
          <div className="glass space-y-3 rounded-2xl p-4">
            {navLinks.map((item) => (
              <a key={item.label} href={item.href} className={`block ${navItemClasses}`}>
                {item.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="flex-1 inline-flex items-center justify-center rounded-xl border border-slate-300/70 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout()
                      navigate('/')
                    }}
                    className="flex-1 inline-flex items-center justify-center rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex-1 inline-flex items-center justify-center rounded-xl border border-slate-300/70 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="flex-1 inline-flex items-center justify-center rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Signup
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default Navbar
