import React from 'react'
import MobileThemeProvider from '../../mobile/ThemeProvider'
import BottomNav from '../../mobile/components/BottomNav'
import GlassCard from '../../mobile/components/GlassCard'
import PrimaryButton from '../../mobile/components/PrimaryButton'
import SectionHeader from '../../mobile/components/SectionHeader'

export default function Home() {
  return (
    <MobileThemeProvider>
      <div className="mobile-shell mobile-container px-4 py-4">
        <SectionHeader title="Welcome, Driver" subtitle="DriveLegal AI — Mobile" />

        <div className="space-y-3">
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#94A3B8]">Driver Profile</div>
                <div className="font-bold text-lg">Guest Driver</div>
                <div className="text-xs text-[#94A3B8] mt-1">Vehicle: Unknown</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#94A3B8]">Trust Score</div>
                <div className="font-black text-xl text-[#4DA3FF]">—</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-[#94A3B8]">Compliance</div>
                <div className="font-bold">—</div>
              </div>
              <div>
                <div className="text-xs text-[#94A3B8]">Pending Challans</div>
                <div className="font-bold text-[#EF4444]">0</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div>
              <div className="text-xs text-[#94A3B8]">Recent Trip</div>
              <div className="font-bold mt-1">No recent trips</div>
            </div>
          </GlassCard>

          <div className="mt-4">
            <PrimaryButton onClick={() => { window.location.href = '/mobile/drive' }}>START DRIVING</PrimaryButton>
          </div>
        </div>

        <div style={{ height: 88 }} />
        <BottomNav />
      </div>
    </MobileThemeProvider>
  )
}
