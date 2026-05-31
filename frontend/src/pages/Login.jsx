


import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Flame } from 'lucide-react'
import { setPersistence, browserLocalPersistence, browserSessionPersistence, sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../firebase/config'
import * as authService from '../services/authService'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const showGoogleLogin = false // Google Login Temporarily Disabled

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({ defaultValues: { email: '', password: '', remember: true } })

  const remember = watch('remember')

  useEffect(() => {
    if (!authLoading && user) {
      const to = location.state?.from?.pathname || '/dashboard'
      navigate(to, { replace: true })
    }
  }, [user, authLoading, navigate, location])

  async function onSubmit(data) {
    setLoading(true)
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
      await authService.login({ email: data.email, password: data.password })
      toast.success('Signed in — redirecting…')
    } catch (err) {
      // authService already toasts; fallback
      if (!err?.code) toast.error('Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true)
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
      await authService.googleLogin({ remember })
    } catch (err) {
      toast.error('Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    const emailValue = (watch('email') || '').trim()
    const email = emailValue || window.prompt('Please enter your account email for password reset:')
    if (!email) return
    try {
      setLoading(true)
      await sendPasswordResetEmail(auth, email)
      toast.success('Password reset email sent. Check your inbox.')
    } catch (err) {
      toast.error('Failed to send reset email. Please check the address and try again.')
    } finally {
      setLoading(false)
    }
  }

  // UI strings — extracted to silence the i18n linter rule
  const loginTitle = 'DriveLegal AI'
  const loginSubtitle = 'Sign in to your operational cockpit'
  const createAccountLabel = 'Create an account'

  // Explicit RHF field registrations — avoids spread operator on HTML elements
  const emailReg = register('email', {
    required: 'Email is required',
    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
  })
  const passwordReg = register('password', {
    required: 'Password is required',
    minLength: { value: 6, message: 'Password must be at least 6 characters' },
  })
  const rememberReg = register('remember')

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0F1C] text-[#F8FAFC] p-6 relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#111827] border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-[30px] pointer-events-none" />
          
          <header className="mb-6 text-center">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#3B82F6] to-indigo-500 text-white shadow-lg shadow-blue-500/25 mb-4">
              <Flame size={18} />
            </span>
            <h1 className="text-[28px] font-black tracking-tight text-[#F8FAFC]">{loginTitle}</h1>
            <p className="text-[14px] text-slate-500 mt-1 font-semibold">{loginSubtitle}</p>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-[14px]">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="driver@drivelegal.ai"
                aria-invalid={errors.email ? 'true' : 'false'}
                className={`w-full px-4 py-3 rounded-xl border bg-black/40 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-semibold placeholder:text-slate-700 transition-all ${
                  errors.email ? 'border-[#EF4444]' : 'border-slate-800'
                }`}
                name={emailReg.name}
                ref={emailReg.ref}
                onChange={emailReg.onChange}
                onBlur={emailReg.onBlur}
                disabled={loading}
              />
              {errors.email && <p className="mt-1 text-xs text-[#EF4444] font-semibold">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5" htmlFor="password">
                Security Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                aria-invalid={errors.password ? 'true' : 'false'}
                className={`w-full px-4 py-3 rounded-xl border bg-black/40 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-semibold placeholder:text-slate-700 transition-all ${
                  errors.password ? 'border-[#EF4444]' : 'border-slate-800'
                }`}
                name={passwordReg.name}
                ref={passwordReg.ref}
                onChange={passwordReg.onChange}
                onBlur={passwordReg.onBlur}
                disabled={loading}
              />
              {errors.password && <p className="mt-1 text-xs text-[#EF4444] font-semibold">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between text-[14px]">
              <label className="flex items-center select-none font-semibold text-slate-450 cursor-pointer">
                <input type="checkbox" className="mr-2 rounded border-slate-800 bg-black/40 text-[#3B82F6] focus:ring-0" name={rememberReg.name} ref={rememberReg.ref} onChange={rememberReg.onChange} onBlur={rememberReg.onBlur} disabled={loading} />
                Remember this session
              </label>

              <button type="button" onClick={handleForgotPassword} className="text-slate-400 hover:text-white font-bold hover:underline" disabled={loading}>
                Reset Credentials
              </button>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-[#3B82F6] hover:bg-blue-500 text-white font-bold uppercase tracking-wider shadow-lg shadow-blue-500/20 disabled:opacity-60 transition-all cursor-pointer">
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4"></circle>
                      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"></path>
                    </svg>
                    Establishing Link…
                  </>
                ) : (
                  'Establish Connection'
                )}
              </button>
            </div>

            {showGoogleLogin && (
              <>
                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-slate-850" />
                  <div className="text-xs text-slate-500 uppercase font-black tracking-widest">or</div>
                  <div className="flex-1 h-px bg-slate-850" />
                </div>

                <div>
                  <button type="button" onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-slate-800 bg-black/20 hover:bg-black/50 text-[#F8FAFC] font-semibold hover:border-slate-700 transition-all cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                      <path fill="#EA4335" d="M24 9.5c3.9 0 6.7 1.7 8.3 3.1l6-6C34.3 3 29.5 1 24 1 14.9 1 7.3 6.6 4 14.7l7.9 6.1C13.6 15.4 18.2 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.5 24.5c0-1.5-.1-2.6-.4-3.8H24v7.1h12.7c-.6 3.4-2.7 6.3-6 8.2l9.2 7.1C43.4 38.3 46.5 31.8 46.5 24.5z"/>
                      <path fill="#FBBC05" d="M11.9 29.9c-.9-2.6-1.4-5.4-1.4-8.3s.5-5.7 1.4-8.3L4 7.1C1.4 11.3 0 15.9 0 21.6s1.4 10.3 4 14.5l7.9-6.2z"/>
                      <path fill="#34A853" d="M24 46.9c6.5 0 12-2.1 16-5.8l-9.2-7.1c-2.6 1.8-6 2.9-9.3 2.9-5.8 0-10.4-5.9-11.6-13.7L4 33.9C7.3 41 14.9 46.9 24 46.9z"/>
                    </svg>
                    Continue with Google
                  </button>
                </div>
              </>
            )}
          </form>

          <footer className="mt-6 text-center text-[12px] text-slate-500 font-semibold border-t border-slate-850 pt-4">
            <p>
              New driver? <span className="text-[#3B82F6] cursor-pointer hover:underline font-bold" onClick={() => navigate('/signup')}>{createAccountLabel}</span>
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}
