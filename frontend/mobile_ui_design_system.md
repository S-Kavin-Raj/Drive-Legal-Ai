# DriveLegal AI — Mobile UI Design System

This document describes the mobile-first UI foundation created for DriveLegal AI. It contains screen hierarchy, navigation, design tokens, component inventory, UX rules, and responsive strategy.

1. Screen hierarchy
- MobileShell (/mobile)
  - Home (/mobile/home)
  - Plan Trip (/mobile/plan)
  - Driving Mode (/mobile/drive)
  - Challan Manager (/mobile/challan)
  - Traffic Assistant (/mobile/assistant)
  - Settings (/mobile/settings)

2. Navigation structure
- Bottom tab navigation with six tabs: Home, Trip, Drive, Challan, Assistant, Settings.
- Each tab maps to a mobile route under `/mobile/*`.

3. Design tokens
- See `src/mobile/tokens.js` for core tokens:
  - Colors: background #0B0F14, surface #131A22, primary #4DA3FF, success #22C55E, warning #F59E0B, danger #EF4444, text #F8FAFC, muted #94A3B8
  - Spacing, typography scale, radii

4. Component inventory
- GlassCard — glassmorphism container
- FloatingPanel — floating summary panel
- StatusBadge — small status indicator
- PrimaryButton / SecondaryButton — button styles
- SectionHeader — title + subtitle
- InfoCard / MetricCard — compact data display
- BottomNav — mobile bottom tab bar

5. Mobile UX rules
- Design for single-column vertical scrolling.
- Prioritize large touch targets (min 44x44 px), thumb-friendly bottom navigation.
- Use progressive disclosure: floating panels for summaries and CTA.
- Avoid multi-column dashboards; keep content shallow and focused.

6. Responsive strategy
- Target widths: 360x800, 390x844, 412x915.
- Mobile container caps at 420px and centers on larger screens.
- Reuse tokens across components; avoid layout changes between mobile sizes.

7. Performance
- Screens use React.lazy + Suspense for code-splitting.
- Small reusable components reduce bundle duplication.

8. Files created
- `src/mobile/` — ThemeProvider, tokens, mobile.css
- `src/mobile/components/` — GlassCard, FloatingPanel, StatusBadge, PrimaryButton, SecondaryButton, SectionHeader, InfoCard, MetricCard, BottomNav
- `src/pages/mobile/*.jsx` — Home, PlanTrip, DrivingMode, ChallanManager, TrafficAssistant, Settings
- `src/pages/MobileApp.jsx` — Mobile route shell

Notes
- This is design-only: no business logic, no onboarding, no driving mode telemetry, no AI.
- Next step: Phase 1 vehicle onboarding + profile (when requested).
