import React from 'react'
import MobileThemeProvider from '../../mobile/ThemeProvider'
import BottomNav from '../../mobile/components/BottomNav'
import GlassCard from '../../mobile/components/GlassCard'
import PrimaryButton from '../../mobile/components/PrimaryButton'
import SectionHeader from '../../mobile/components/SectionHeader'

export default function DrivingMode() {
  return (
    <MobileThemeProvider>
      <div className="mobile-shell mobile-container px-4 py-4">
        <SectionHeader title="Driving Mode" subtitle="Design preview" />

        <div className="space-y-3">
          <GlassCard>
            <div className="text-center">
              <div className="text-xs text-[#94A3B8]">Current Speed</div>
              <div className="font-extrabold text-4xl">0 km/h</div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-[#94A3B8]">Distance</div>
                <div className="font-bold">—</div>
              </div>
              <div>
                <div className="text-xs text-[#94A3B8]">ETA</div>
                <div className="font-bold">—</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="text-xs text-[#94A3B8]">Alert Area</div>
            <div className="font-bold mt-1">—</div>
          </GlassCard>

          <div className="mt-4">
            <PrimaryButton onClick={() => { /* design only */ }} className="w-full">STOP DRIVING</PrimaryButton>
          </div>
        </div>

        <div style={{ height: 88 }} />
        <BottomNav />
      </div>
    </MobileThemeProvider>
  )
}
