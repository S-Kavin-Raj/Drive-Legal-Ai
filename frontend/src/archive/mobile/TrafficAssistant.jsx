import React from 'react'
import MobileThemeProvider from '../../mobile/ThemeProvider'
import BottomNav from '../../mobile/components/BottomNav'
import GlassCard from '../../mobile/components/GlassCard'
import SectionHeader from '../../mobile/components/SectionHeader'

export default function TrafficAssistant() {
  return (
    <MobileThemeProvider>
      <div className="mobile-shell mobile-container px-4 py-4">
        <SectionHeader title="Traffic Assistant" subtitle="Chat & quick help" />

        <div className="space-y-3">
          <GlassCard>
            <div className="text-xs text-[#94A3B8]">Chat</div>
            <div className="mt-2 text-sm text-[#94A3B8]">(Design-only chat UI placeholder)</div>
          </GlassCard>

          <GlassCard>
            <div className="text-xs text-[#94A3B8]">Quick Suggestions</div>
            <div className="mt-2 flex gap-2">
              <button className="px-3 py-2 rounded bg-black/30">What to carry</button>
              <button className="px-3 py-2 rounded bg-black/30">Speed rules</button>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="text-xs text-[#94A3B8]">Traffic Law Categories</div>
            <div className="mt-2 text-sm">—</div>
          </GlassCard>
        </div>

        <div style={{ height: 88 }} />
        <BottomNav />
      </div>
    </MobileThemeProvider>
  )
}
