import React from 'react'
import MobileThemeProvider from '../../mobile/ThemeProvider'
import BottomNav from '../../mobile/components/BottomNav'
import GlassCard from '../../mobile/components/GlassCard'
import PrimaryButton from '../../mobile/components/PrimaryButton'
import SectionHeader from '../../mobile/components/SectionHeader'

export default function PlanTrip() {
  return (
    <MobileThemeProvider>
      <div className="mobile-shell mobile-container px-4 py-4">
        <SectionHeader title="Plan Trip" subtitle="Create a safe route" />

        <div className="space-y-3">
          <GlassCard>
            <div className="space-y-2">
              <input placeholder="Source" className="w-full p-3 rounded bg-black/30" />
              <input placeholder="Destination" className="w-full p-3 rounded bg-black/30" />
              <PrimaryButton onClick={() => { /* design only */ }}>Analyze Route</PrimaryButton>
            </div>
          </GlassCard>

          <div className="glass-card h-64 mt-2">{/* Map placeholder */}
            <div className="h-full flex items-center justify-center text-[#94A3B8]">Map Preview</div>
          </div>

          <div className="floating-panel">
            <div className="glass-card p-3">
              <div className="flex justify-between">
                <div>
                  <div className="text-xs text-[#94A3B8]">Distance</div>
                  <div className="font-bold">—</div>
                </div>
                <div>
                  <div className="text-xs text-[#94A3B8]">ETA</div>
                  <div className="font-bold">—</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 88 }} />
        <BottomNav />
      </div>
    </MobileThemeProvider>
  )
}
