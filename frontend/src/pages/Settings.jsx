import React, { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { InfoCard } from '../components/ui/InfoCard'
import { 
  Globe, Bell, Volume2, Car, LogOut, ChevronRight, RefreshCw, VolumeX
} from 'lucide-react'
import { useUserProfile } from '../hooks/useUserProfile'
import { updateUserSettings } from '../services/userProfileService'
import { setVoiceAlertsEnabled, setVoiceLanguage } from '../services/voiceEngine'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import toast from 'react-hot-toast'

export default function Settings() {
  const { profile, loading, refetch } = useUserProfile()
  const [updating, setUpdating] = useState(false)

  const voiceAlerts = profile?.settings?.voiceAlerts !== false // default: true
  const notificationsEnabled = profile?.settings?.notificationsEnabled !== false // default: true
  const currentLang = profile?.settings?.language || 'en' // default: 'en'
  const vehicleType = profile?.vehicleType || 'car'

  // Propagate values to the local voice alerts engine
  setVoiceAlertsEnabled(voiceAlerts)
  setVoiceLanguage(currentLang)

  async function handleToggleNotifications() {
    if (!profile?.id) return
    setUpdating(true)
    try {
      const updatedSettings = {
        ...profile?.settings,
        notificationsEnabled: !notificationsEnabled
      }
      await updateUserSettings(profile.id, updatedSettings)
      await refetch()
      toast.success(`System Notifications ${!notificationsEnabled ? 'Enabled' : 'Disabled'}`)
    } catch (e) {
      console.error(e)
      toast.error('Failed to update notifications settings')
    } finally {
      setUpdating(false)
    }
  }

  async function handleToggleVoice() {
    if (!profile?.id) return
    setUpdating(true)
    try {
      const updatedSettings = {
        ...profile?.settings,
        voiceAlerts: !voiceAlerts
      }
      await updateUserSettings(profile.id, updatedSettings)
      setVoiceAlertsEnabled(!voiceAlerts)
      await refetch()
      toast.success(`Voice Alerts ${!voiceAlerts ? 'Enabled' : 'Disabled'}`)
    } catch (e) {
      console.error(e)
      toast.error('Failed to update voice settings')
    } finally {
      setUpdating(false)
    }
  }

  async function handleCycleLanguage() {
    if (!profile?.id) return
    setUpdating(true)
    try {
      // Prepared multi-lingual sequence (Step 7)
      const nextLang = currentLang === 'en' ? 'ta' : currentLang === 'ta' ? 'hi' : 'en'
      const updatedSettings = {
        ...profile?.settings,
        language: nextLang
      }
      await updateUserSettings(profile.id, updatedSettings)
      setVoiceLanguage(nextLang)
      await refetch()
      
      const langNames = { en: 'English', ta: 'Tamil (தமிழ்)', hi: 'Hindi (हिन्दी)' }
      toast.success(`Language set to ${langNames[nextLang]}`)
    } catch (e) {
      console.error(e)
      toast.error('Failed to update language settings')
    } finally {
      setUpdating(false)
    }
  }

  async function handleSignOut() {
    try {
      await signOut(auth)
      toast.success('Signed out successfully')
    } catch (e) {
      toast.error('Failed to sign out')
    }
  }

  const getLangName = (code) => {
    if (code === 'ta') return 'Tamil (தமிழ்)'
    if (code === 'hi') return 'Hindi (हिन्दी)'
    return 'English'
  }

  return (
    <div className="flex flex-col gap-6 animate-fadeIn p-4 pb-24" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <PageHeader title="Settings" />

      {loading ? (
        <div className="text-center py-12 flex flex-col items-center gap-2 text-slate-500 text-xs font-semibold">
          <RefreshCw size={22} className="animate-spin text-purple-500" />
          <span>Synchronizing preferences...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[9px] font-black tracking-[0.18em] uppercase text-purple-400 px-1">
            User Configurations
          </p>

          {/* Voice Alerts Toggle Row */}
          <div 
            onClick={handleToggleVoice}
            className="flex items-center justify-between p-4 bg-[#131A22] border border-white/5 rounded-2xl active:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                {voiceAlerts ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </div>
              <div>
                <span className="text-[14px] font-black text-slate-200 block">Voice Alerts Guidance</span>
                <span className="text-[10px] text-slate-500 font-semibold mt-0.5">MVA Compliance Spoken Alerts</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span 
                className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md"
                style={{
                  background: voiceAlerts ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                  color: voiceAlerts ? '#22C55E' : '#EF4444',
                  border: `1px solid ${voiceAlerts ? '#22C55E' : '#EF4444'}20`
                }}
              >
                {voiceAlerts ? 'ON' : 'OFF'}
              </span>
              <div 
                className="w-10 h-6 rounded-full p-1 transition-colors duration-300 flex items-center cursor-pointer"
                style={{ background: voiceAlerts ? '#8900F2' : 'rgba(255,255,255,0.1)' }}
              >
                <div 
                  className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300"
                  style={{ transform: voiceAlerts ? 'translateX(16px)' : 'translateX(0px)' }}
                />
              </div>
            </div>
          </div>

          {/* Dynamic Language Selection Row */}
          <div 
            onClick={handleCycleLanguage}
            className="flex items-center justify-between p-4 bg-[#131A22] border border-white/5 rounded-2xl active:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                <Globe size={20} />
              </div>
              <div>
                <span className="text-[14px] font-black text-slate-200 block">System Language</span>
                <span className="text-[10px] text-slate-500 font-semibold mt-0.5">Spoken Alert Vocabularies</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <span className="text-[11px] font-bold text-purple-400 bg-purple-500/5 px-2 py-1 border border-purple-500/10 rounded-lg">
                {getLangName(currentLang)}
              </span>
              <ChevronRight size={14} className="text-slate-500" />
            </div>
          </div>

          {/* Vehicle category display (Static reference from profile) */}
          <div className="flex items-center justify-between p-4 bg-[#131A22] border border-white/5 rounded-2xl opacity-80 select-none">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-800 text-slate-400">
                <Car size={20} />
              </div>
              <div>
                <span className="text-[14px] font-black text-slate-400 block">Registered Vehicle</span>
                <span className="text-[10px] text-slate-650 font-semibold mt-0.5">Defined Onboarding Profile</span>
              </div>
            </div>
            <span className="text-[10px] font-black tracking-widest uppercase bg-slate-900 border border-slate-850 px-2.5 py-1 text-slate-400 rounded-lg">
              {vehicleType}
            </span>
          </div>

          {/* Notifications setting card */}
          <div 
            onClick={handleToggleNotifications}
            className="flex items-center justify-between p-4 bg-[#131A22] border border-white/5 rounded-2xl active:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                <Bell size={20} />
              </div>
              <div>
                <span className="text-[14px] font-black text-slate-200 block">System Notifications</span>
                <span className="text-[10px] text-slate-500 font-semibold mt-0.5">Standard App Notifications</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span 
                className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md"
                style={{
                  background: notificationsEnabled ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                  color: notificationsEnabled ? '#22C55E' : '#EF4444',
                  border: `1px solid ${notificationsEnabled ? '#22C55E' : '#EF4444'}20`
                }}
              >
                {notificationsEnabled ? 'ON' : 'OFF'}
              </span>
              <div 
                className="w-10 h-6 rounded-full p-1 transition-colors duration-300 flex items-center cursor-pointer"
                style={{ background: notificationsEnabled ? '#8900F2' : 'rgba(255,255,255,0.1)' }}
              >
                <div 
                  className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300"
                  style={{ transform: notificationsEnabled ? 'translateX(16px)' : 'translateX(0px)' }}
                />
              </div>
            </div>
          </div>

        </div>
      )}

      <div className="mt-8">
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-black text-xs uppercase tracking-wider active:scale-95 transition-transform"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  )
}