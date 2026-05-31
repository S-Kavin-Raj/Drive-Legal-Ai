import React from 'react'
import MobileThemeProvider from '../../mobile/ThemeProvider'
import BottomNav from '../../mobile/components/BottomNav'
import GlassCard from '../../mobile/components/GlassCard'
import SectionHeader from '../../mobile/components/SectionHeader'

export default function Settings() {
  return (
    <MobileThemeProvider>
      <div className="mobile-shell mobile-container px-4 py-4">
        <SectionHeader title="Settings" subtitle="App preferences" />

        <div className="space-y-3">
          <GlassCard>
            <div className="text-xs text-[#94A3B8]">Language</div>
          </GlassCard>

          <GlassCard>
            <div className="text-xs text-[#94A3B8]">Theme</div>
          </GlassCard>

          <GlassCard>
            <div className="text-xs text-[#94A3B8]">Notifications</div>
          </GlassCard>

          <GlassCard>
            <div className="text-xs text-[#94A3B8]">Voice Alerts</div>
          </GlassCard>

          <GlassCard>
            <div className="text-xs text-[#94A3B8]">Vehicle Type</div>
          </GlassCard>
        </div>

        <div style={{ height: 88 }} />
        <BottomNav />
      </div>
    </MobileThemeProvider>
  )
}
