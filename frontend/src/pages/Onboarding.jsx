import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { saveOnboardingProfile } from '../services/userProfileService'
import { COMPLIANCE_QUESTIONS } from '../hooks/useComplianceProfile'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { GlassCard } from '../components/ui/GlassCard'
import { auth } from '../firebase/config'
import toast from 'react-hot-toast'

/* ─── Vehicle type metadata ─────────────────────────────────────── */
const VEHICLE_TYPES = [
  { id: 'bike',       label: 'Bike',               emoji: '🏍️', description: 'Two-wheeler / Motorcycle' },
  { id: 'car',        label: 'Car',                emoji: '🚗', description: 'Private four-wheeler' },
  { id: 'commercial', label: 'Commercial Vehicle', emoji: '🚛', description: 'Truck / Bus / Auto' },
]

/* ─── Step indicator ─────────────────────────────────────────────── */
function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            i < current
              ? 'bg-[#4DA3FF] w-8'
              : i === current
              ? 'bg-[#4DA3FF] w-8'
              : 'bg-white/10 w-4'
          }`}
        />
      ))}
    </div>
  )
}

/* ─── Step 1: Vehicle Selection ─────────────────────────────────── */
function StepVehicle({ selected, onSelect }) {
  return (
    <div className="flex flex-col gap-4 animate-fadeIn">
      <div className="text-center mb-6">
        <h1 className="text-[28px] font-black text-[#F8FAFC] tracking-tight">What do you drive?</h1>
        <p className="text-[14px] text-[#94A3B8] mt-2">We&apos;ll tailor your compliance checklist to your vehicle type.</p>
      </div>

      <div className="flex flex-col gap-3">
        {VEHICLE_TYPES.map((v) => {
          const isSelected = selected === v.id
          return (
            <button
              key={v.id}
              onClick={() => onSelect(v.id)}
              className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all duration-200 active:scale-[0.98] ${
                isSelected
                  ? 'border-[#4DA3FF] bg-[#4DA3FF]/10'
                  : 'border-white/8 bg-white/[0.03] hover:border-white/20'
              }`}
            >
              <span className="text-4xl">{v.emoji}</span>
              <div className="flex-1">
                <p className="font-black text-[16px] text-[#F8FAFC]">{v.label}</p>
                <p className="text-[13px] text-[#94A3B8]">{v.description}</p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isSelected ? 'border-[#4DA3FF] bg-[#4DA3FF]' : 'border-white/20'
                }`}
              >
                {isSelected && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Step 2: Compliance Questions ──────────────────────────────── */
function StepCompliance({ vehicleType, answers, onToggle }) {
  const questions = COMPLIANCE_QUESTIONS[vehicleType] ?? []

  return (
    <div className="flex flex-col gap-4 animate-fadeIn">
      <div className="text-center mb-6">
        <h1 className="text-[28px] font-black text-[#F8FAFC] tracking-tight">Document Checklist</h1>
        <p className="text-[14px] text-[#94A3B8] mt-2">Mark what you currently have available with your vehicle.</p>
      </div>

      <div className="flex flex-col gap-3">
        {questions.map((q) => {
          const isChecked = answers[q.key] === true
          return (
            <button
              key={q.key}
              onClick={() => onToggle(q.key)}
              className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200 active:scale-[0.98] ${
                isChecked
                  ? 'border-[#22C55E]/40 bg-[#22C55E]/8'
                  : 'border-white/8 bg-white/[0.03]'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                  isChecked ? 'border-[#22C55E] bg-[#22C55E]' : 'border-white/20'
                }`}
              >
                {isChecked && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className={`font-bold text-[15px] transition-colors ${isChecked ? 'text-[#22C55E]' : 'text-[#F8FAFC]'}`}>
                  {q.label}
                </p>
                <p className="text-[12px] text-[#94A3B8]">Section {q.section} MV Act</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Step 3: Summary / Confirmation ────────────────────────────── */
function StepSummary({ vehicleType, answers, saving }) {
  const vehicleMeta = VEHICLE_TYPES.find((v) => v.id === vehicleType)
  const questions = COMPLIANCE_QUESTIONS[vehicleType] ?? []
  const trueCount = questions.filter((q) => answers[q.key]).length
  const pct = questions.length > 0 ? Math.round((trueCount / questions.length) * 100) : 0

  const statusColor = pct === 100 ? '#22C55E' : pct >= 50 ? '#F59E0B' : '#EF4444'
  const statusLabel = pct === 100 ? 'Ready to Drive' : pct >= 50 ? 'Partial Compliance' : 'Not Ready'

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      <div className="text-center mb-2">
        <h1 className="text-[28px] font-black text-[#F8FAFC] tracking-tight">All Set!</h1>
        <p className="text-[14px] text-[#94A3B8] mt-2">Here is your driver profile summary.</p>
      </div>

      <GlassCard className="p-5 flex items-center gap-4">
        <span className="text-4xl">{vehicleMeta?.emoji}</span>
        <div>
          <p className="font-black text-[18px] text-[#F8FAFC]">{vehicleMeta?.label}</p>
          <p className="text-[14px] text-[#94A3B8]">{vehicleMeta?.description}</p>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-black uppercase tracking-widest text-[#94A3B8]">Compliance Score</span>
          <span className="font-black text-[22px]" style={{ color: statusColor }}>{pct}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: statusColor }}
          />
        </div>

        <p className="text-[13px] font-bold mt-3" style={{ color: statusColor }}>
          Status: {statusLabel}
        </p>
      </GlassCard>

      <GlassCard className="p-5">
        <p className="text-[12px] font-black uppercase tracking-widest text-[#94A3B8] mb-3">Documents</p>
        <div className="space-y-2">
          {questions.map((q) => (
            <div key={q.key} className="flex items-center justify-between">
              <span className="text-[14px] text-[#F8FAFC]">{q.label}</span>
              <span className={`text-[12px] font-black ${answers[q.key] ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                {answers[q.key] ? '✓ YES' : '✗ NO'}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {saving && (
        <div className="flex items-center justify-center gap-2 text-[#4DA3FF]">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-[14px] font-bold">Saving your profile…</span>
        </div>
      )}
    </div>
  )
}

/* ─── Main Onboarding Wizard ────────────────────────────────────── */
const TOTAL_STEPS = 3

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [vehicleType, setVehicleType] = useState(null)
  const [complianceAnswers, setComplianceAnswers] = useState({})
  const [saving, setSaving] = useState(false)
  const [firebaseUser, setFirebaseUser] = useState(auth.currentUser)

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setFirebaseUser(u)
    })
    return unsub
  }, [])

  function handleToggleAnswer(key) {
    setComplianceAnswers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleFinish() {
    if (!auth.currentUser) {
      toast.error('Authentication state is missing. Awaiting credentials...')
      return
    }



    setSaving(true)
    try {
      await saveOnboardingProfile(auth.currentUser.uid, {
        vehicleType,
        complianceProfile: complianceAnswers,
      })
      toast.success('Profile saved! Welcome to DriveLegal AI.')
      // Trigger initial trust score calculation after onboarding
      import('../services/trustScoreService').then(m => m.recalculateTrustScore(auth.currentUser.uid)).catch(() => {})
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('[Onboarding] Save error:', err.code, err.message)
      toast.error(`Failed to save profile [${err.code || 'UNKNOWN'}]: ${err.message || 'Please try again.'}`)
    } finally {
      setSaving(false)
    }
  }

  function canProceed() {
    if (!firebaseUser) return false
    if (step === 0) return vehicleType !== null
    // step 1 (compliance) — no mandatory answer, user can skip with all NO
    if (step === 1) return true
    return true
  }

  function handleNext() {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1)
    else handleFinish()
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1)
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{ background: '#0B0F14', color: '#F8FAFC' }}
    >
      {/* Header */}
      <div className="px-6 pt-12 pb-2 flex items-center justify-between">
        <div>
          <span className="text-[12px] font-black uppercase tracking-widest text-[#4DA3FF]">
            DRIVELEGAL AI
          </span>
          <p className="text-[12px] text-[#94A3B8] mt-0.5">Driver Setup • Step {step + 1} of {TOTAL_STEPS}</p>
        </div>
        {step > 0 && (
          <button
            onClick={handleBack}
            className="text-[14px] font-bold text-[#94A3B8] hover:text-white transition-colors active:scale-95"
          >
            ← Back
          </button>
        )}
      </div>

      <StepIndicator current={step} total={TOTAL_STEPS} />

      {/* Step content */}
      <div className="flex-1 px-6 overflow-y-auto pb-36">
        {step === 0 && (
          <StepVehicle selected={vehicleType} onSelect={setVehicleType} />
        )}
        {step === 1 && vehicleType && (
          <StepCompliance
            vehicleType={vehicleType}
            answers={complianceAnswers}
            onToggle={handleToggleAnswer}
          />
        )}
        {step === 2 && (
          <StepSummary
            vehicleType={vehicleType}
            answers={complianceAnswers}
            saving={saving}
          />
        )}
        
        {/* Task 3: If firebaseUser is null (auth state is null), wait and show loading state */}
        {(!firebaseUser || saving) && (
          <div className="flex items-center justify-center gap-2 text-[#4DA3FF] mt-4 py-2">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-[13px] font-black uppercase tracking-wider">
              {!firebaseUser ? 'Awaiting authenticated credentials…' : 'Saving driver profile…'}
            </span>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-10 pt-4 bg-gradient-to-t from-[#0B0F14] to-transparent">
        <PrimaryButton
          onClick={handleNext}
          disabled={!canProceed() || saving || !firebaseUser}
          className={`py-5 text-[16px] transition-opacity ${!canProceed() || saving || !firebaseUser ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {step === TOTAL_STEPS - 1 ? 'Save Profile & Continue' : 'Continue →'}
        </PrimaryButton>
      </div>
    </div>
  )
}
