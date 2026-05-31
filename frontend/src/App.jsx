import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import SplashScreen from './pages/SplashScreen'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ProtectedRoute from './components/routing/ProtectedRoute'
import OnboardingGuard from './components/routing/OnboardingGuard'
import Unauthorized from './pages/Unauthorized'
import { MobileLayout } from './components/layout/MobileLayout'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const PlanTrip = lazy(() => import('./pages/PlanTrip'))
const DrivingMode = lazy(() => import('./pages/DrivingMode'))
const ChallanManager = lazy(() => import('./pages/ChallanManager'))
const TrafficAssistant = lazy(() => import('./pages/TrafficAssistant'))
const TrafficAssistantChat = lazy(() => import('./pages/TrafficAssistantChat'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))
const DocumentVault = lazy(() => import('./pages/DocumentVault'))
const DrivingSummary = lazy(() => import('./pages/DrivingSummary'))

function App() {
  return (
    <div className="relative overflow-x-hidden min-h-screen bg-[#08090D]">
      <main>
        <Suspense fallback={<div className="p-8 text-center text-[#8900F2]">Loading...</div>}>
          <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            <Route element={<ProtectedRoute />}>
              {/* Onboarding — no MobileLayout, no OnboardingGuard (guard-exempt) */}
              <Route path="/onboarding" element={<Onboarding />} />
 
              {/* All app routes require completed onboarding */}
              <Route element={<OnboardingGuard />}>
                <Route element={<MobileLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/plan-trip" element={<PlanTrip />} />
                  <Route path="/driving-mode" element={<DrivingMode />} />
                  <Route path="/challan-manager" element={<ChallanManager />} />
                  <Route path="/traffic-assistant" element={<TrafficAssistant />} />
                  <Route path="/traffic-assistant-chat" element={<TrafficAssistantChat />} />
                  <Route path="/document-vault" element={<DocumentVault />} />
                  <Route path="/driving-summary" element={<DrivingSummary />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

export default App
