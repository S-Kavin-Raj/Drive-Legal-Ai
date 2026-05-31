import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

const Home = lazy(() => import('./mobile/Home'))
const PlanTrip = lazy(() => import('./mobile/PlanTrip'))
const DrivingMode = lazy(() => import('./mobile/DrivingMode'))
const ChallanManager = lazy(() => import('./mobile/ChallanManager'))
const TrafficAssistant = lazy(() => import('./mobile/TrafficAssistant'))
const Settings = lazy(() => import('./mobile/Settings'))

export default function MobileApp() {
  return (
    <Suspense fallback={<div className="p-6">Loading mobile app…</div>}>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/plan" element={<PlanTrip />} />
        <Route path="/drive" element={<DrivingMode />} />
        <Route path="/challan" element={<ChallanManager />} />
        <Route path="/assistant" element={<TrafficAssistant />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/" element={<Navigate to="/mobile/home" replace />} />
      </Routes>
    </Suspense>
  )
}
