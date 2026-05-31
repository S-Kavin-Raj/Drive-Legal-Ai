import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Flame } from 'lucide-react'
import toast from 'react-hot-toast'
import * as authService from '../services/authService'
import { useAuth } from '../hooks/useAuth'

export default function Signup() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { name: '', email: '', password: '' } })

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [authLoading, user, navigate])

  async function onSubmit(data) {
    setLoading(true)
    try {
      await authService.signUp({ name: data.name, email: data.email, password: data.password })
      toast.success('Account created — redirecting to dashboard')
    } catch (err) {
      // authService will toast
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0F1C] text-[#F8FAFC] p-6 relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#111827] border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-24 h-24 bg-blue-500/5 rounded-full blur-[30px] pointer-events-none" />

          <header className="mb-6 text-center">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#3B82F6] to-indigo-500 text-white shadow-lg shadow-blue-500/25 mb-4">
              <Flame size={18} />
            </span>
            <h2 className="text-[28px] font-black tracking-tight text-[#F8FAFC]">Create an Account</h2>
            <p className="text-[14px] text-slate-500 mt-1 font-semibold">Join the premium driver intelligence ledger</p>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-[14px]">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Full Name</label>
              <input 
                placeholder="John Doe"
                className={`w-full px-4 py-3 rounded-xl border bg-black/40 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-semibold placeholder:text-slate-700 transition-all ${
                  errors.name ? 'border-[#EF4444]' : 'border-slate-800'
                }`}
                {...register('name', { required: 'Name required' })} 
              />
              {errors.name && <p className="mt-1 text-xs text-[#EF4444] font-semibold">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email Address</label>
              <input 
                placeholder="driver@drivelegal.ai"
                className={`w-full px-4 py-3 rounded-xl border bg-black/40 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-semibold placeholder:text-slate-700 transition-all ${
                  errors.email ? 'border-[#EF4444]' : 'border-slate-800'
                }`}
                {...register('email', { required: 'Email required' })} 
              />
              {errors.email && <p className="mt-1 text-xs text-[#EF4444] font-semibold">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Security Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                className={`w-full px-4 py-3 rounded-xl border bg-black/40 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-semibold placeholder:text-slate-700 transition-all ${
                  errors.password ? 'border-[#EF4444]' : 'border-slate-800'
                }`}
                {...register('password', { required: 'Password required', minLength: { value: 6, message: 'Minimum length is 6 characters' } })} 
              />
              {errors.password && <p className="mt-1 text-xs text-[#EF4444] font-semibold">{errors.password.message}</p>}
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full py-3.5 bg-[#3B82F6] hover:bg-blue-500 text-white rounded-xl text-[14px] font-bold uppercase tracking-wider shadow-lg shadow-blue-500/20 disabled:opacity-60 transition-all cursor-pointer"
              >
                {loading ? 'Creating Account…' : 'Initialize Account'}
              </button>
            </div>
          </form>

          <footer className="mt-6 text-center text-[12px] text-slate-500 font-semibold border-t border-slate-850 pt-4">
            <p>
              Already registered? <span className="text-[#3B82F6] cursor-pointer hover:underline font-bold" onClick={() => navigate('/login')}>Sign in instead</span>
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}

