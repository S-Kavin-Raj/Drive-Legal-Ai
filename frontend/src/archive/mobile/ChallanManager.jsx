import React from 'react'
import MobileThemeProvider from '../../mobile/ThemeProvider'
import BottomNav from '../../mobile/components/BottomNav'
import GlassCard from '../../mobile/components/GlassCard'
import PrimaryButton from '../../mobile/components/PrimaryButton'
import SectionHeader from '../../mobile/components/SectionHeader'

export default function ChallanManager() {
  return (
    <MobileThemeProvider>
      <div className="mobile-shell mobile-container px-4 py-4">
        <SectionHeader title="Challan Manager" subtitle="Upload and manage tickets" />

        <div className="space-y-3">
          <GlassCard>
            <div className="text-xs text-[#94A3B8]">Upload Challan</div>
            <div className="mt-3">
              <input type="file" className="w-full" />
            </div>
          </GlassCard>

          <GlassCard>
            <div className="text-xs text-[#94A3B8]">Recent Challans</div>
            <div className="mt-2 text-sm">No items</div>
          </GlassCard>

          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-3">Due Date: —</div>
            <div className="glass-card p-3">Status: —</div>
          </div>
        </div>

        <div style={{ height: 88 }} />
        <BottomNav />
      </div>
    </MobileThemeProvider>
  )
}
