# System Audit Report — DriveLegal AI

This document presents a comprehensive audit of the DriveLegal AI codebase. It outlines the application's structure, integration points, dependencies, and readiness for migration to an Android hybrid environment using Capacitor.

---

## 1. Application Routes

The application uses standard `react-router-dom` (v6) for navigation. All routes are lazy-loaded and partitioned into three access tiers:

| Route Path | Associated Page Component | Guard / Access Level | Mobile Layout Integration |
| :--- | :--- | :--- | :--- |
| `/` | `SplashScreen` | Public / Guest | No |
| `/login` | `Login` | Public / Guest | No |
| `/signup` | `Signup` | Public / Guest | No |
| `/unauthorized` | `Unauthorized` | Public / Guest | No |
| `/onboarding` | `Onboarding` | Protected / Exempt from OnboardingGuard | No |
| `/dashboard` | `Dashboard` | Protected / Requires Onboarding | Yes (`MobileLayout`) |
| `/plan-trip` | `PlanTrip` | Protected / Requires Onboarding | Yes (`MobileLayout`) |
| `/driving-mode` | `DrivingMode` | Protected / Requires Onboarding | Yes (`MobileLayout`) |
| `/challan-manager` | `ChallanManager`| Protected / Requires Onboarding | Yes (`MobileLayout`) |
| `/traffic-assistant`| `TrafficAssistant` | Protected / Requires Onboarding | Yes (`MobileLayout`) |
| `/traffic-assistant-chat`| `TrafficAssistantChat`| Protected / Requires Onboarding | Yes (`MobileLayout`) |
| `/document-vault` | `DocumentVault` | Protected / Requires Onboarding | Yes (`MobileLayout`) |
| `/driving-summary`| `DrivingSummary` | Protected / Requires Onboarding | Yes (`MobileLayout`) |
| `/profile` | `Profile` | Protected / Requires Onboarding | Yes (`MobileLayout`) |
| `/settings` | `Settings` | Protected / Requires Onboarding | Yes (`MobileLayout`) |

---

## 2. Key Components & Pages Hierarchy

The user interface follows a modern mobile-first glassmorphic visual system.

### Page Components (`src/pages/`)
- **`SplashScreen`**: Initial visual load, checks auth state and routes.
- **`Login` / `Signup`**: Public auth gateways using modern styling.
- **`Onboarding`**: Gathers initial compliance profile answers and vehicle type.
- **`Dashboard`**: High-fidelity central console containing Driver Trust Score ring, quick actions, document health summary, and recent driving activity.
- **`PlanTrip`**: Integrates search with interactive Leaflet map overlays for routing.
- **`DrivingMode`**: Premium HUD featuring live speed limit, speed meters, geofenced audio warnings, and real GPS tracking.
- **`DrivingSummary`**: Summarizes the completed trip duration, distance, warnings count, and final calculated Safety Score.
- **`ChallanManager`**: Lists violations and permits manual/OCR-assisted uploads of ticket screenshots.
- **`TrafficAssistant` / `TrafficAssistantChat`**: Dynamic AI companion for localized traffic query support.
- **`DocumentVault`**: Central repository showing document statuses with progress meters for uploading digital files.

### Layout & Utility Components (`src/components/`)
- **`MobileLayout`**: Renders the persistent bottom glassmorphism navigation bar and viewport frame.
- **`ProtectedRoute`**: Restricts unauthorized access, rendering a loading screen during auth transition.
- **`OnboardingGuard`**: Restricts access if the user profile's `onboardingCompleted` flag is falsy.
- **`MapSection/`**: Visualizes OSM maps, route paths, markers, and zones.
- **`ChallanIntelligence/`**: Direct OCR capture, parsing, and analysis widgets.
- **`ComplianceCenter/`**: Visualizes status rings and detailed checklist indicators.

---

## 3. Custom Hooks (`src/hooks/`)

All global and component-level operations are abstracted into stateful hooks:

1. **`useAuth`**: Bridges context-level authentication states, returning user credentials and loading progress.
2. **`useChallans`**: CRUD interactions with Firestore `challanReports` collection.
3. **`useCompliance`**: Checks expiration times of stored documents and compiles global compliance safety values.
4. **`useComplianceProfile`**: Loads/saves specific compliance questionnaires completed during onboarding.
5. **`useDashboardData`**: Direct Firestore aggregate hooks combining compliance status, recent sessions, and trust details.
6. **`useLastSession`**: Queries the most recent completed `drivingSessions` log to display on the dashboard.
7. **`useUserProfile`**: Subscribes to real-time `users/{uid}` updates.
8. **`useRouteAnalysis`**: Manages trip routes, computing waypoints and alert overlaps.
9. **`useTrafficRules`**: Manages geo-boundaries and alerts during drive cycles.

---

## 4. Front-End and Back-End Services

Core logic is isolated inside services within `src/services/` (front-end) and the existing backend controller/service layers:

- **`trafficRuleEngine.js`**: Core algorithmic calculations checking GPS telemetry (`lat`/`lon`/`speed`) against zones and speed restrictions.
- **`voiceEngine.js`**: Utilizes standard browser Speech Synthesis to trigger geofenced auditory cues.
- **`sessionStore.js`**: Local caching layers using standard local Storage interfaces.
- **`authService.js` / `userProfileService.js`**: Adapters for client-side Firebase Auth and Firestore profiles.
- **`orsService.js`**: OpenRouteService wrapper for custom routing calculations.
- **`trustScoreService.js`**: Recalculates driver trust metrics.
- **`apiClient.js`**: Custom Axios instance pointing to the system's back-end with dynamic Bearer token headers.
- **`notificationService.js`**: Backend-backed notification retrieval and read state updates.
- **`trafficAssistantService.js`**: Backend chat gateway for the traffic assistant.
- **`ocrService.js`**: Multipart upload wrapper for challan OCR processing.

---

## 5. Firebase & Firestore Schema Integration

The system relies on Firebase v12 (Web Client SDK) on the frontend. The project connects to Firebase Project ID: `drive-legal-ai-bf028`.

### Core Collections

#### 1. `users`
- **Path**: `users/{uid}`
- **Purpose**: Core user compliance metadata.
- **Schema**:
  ```json
  {
    "email": "string",
    "vehicleType": "car | bike | commercial",
    "onboardingCompleted": true,
    "complianceProfile": {
      "hasInsurance": "yes | no",
      "hasPollutionCertificate": "yes | no",
      "preferredAlerts": "voice | visual"
    },
    "createdAt": "timestamp"
  }
  ```

#### 2. `challanReports`
- **Path**: `challanReports/{challanReportId}`
- **Purpose**: Records representing traffic fines and OCR-assisted challan uploads.
- **Schema**:
  ```json
  {
    "userId": "string",
    "status": "Paid | Overdue | Pending",
    "amount": 1200,
    "dueDate": "string",
    "violationType": "string",
    "ocrConfidence": 0.95
  }
  ```

#### 3. `notifications`
- **Path**: `notifications/{notificationId}`
- **Purpose**: Challan alerts, expiry alerts, and app notifications.

#### 4. `trafficZones`
- **Path**: `trafficZones/{zoneId}`
- **Purpose**: Static coordinate zones for geofencing alerts.

#### 5. `drivingEvents`
- **Path**: `drivingEvents/{eventId}`
- **Purpose**: Event log for live driving telemetry and alert history.

#### 6. `drivingSessions`
- **Path**: `drivingSessions/{sessionId}`
- **Purpose**: High-level log of completed and ongoing drives.
- **Schema**:
  ```json
  {
    "userId": "string",
    "source": "string",
    "destination": "string",
    "startedAt": "string",
    "endedAt": "string",
    "status": "Completed | Active",
    "distanceTravelled": 5.4,
    "averageSpeed": 42.1,
    "warningsCount": 2,
    "violationsCount": 0,
    "duration": 480
  }
  ```

#### 7. `complianceHistory`
- **Path**: `complianceHistory/{id}`
- **Purpose**: Historical compliance snapshots.

#### 8. `trustScores`
- **Path**: `trustScores/{userId}`
- **Purpose**: Central metric score ranging from 300 to 900.
- **Schema**:
  ```json
  {
    "userId": "string",
    "trustScore": 765,
    "grade": "Good",
    "complianceScore": 88,
    "drivingScore": 75,
    "challanScore": 80,
    "consistencyScore": 90,
    "trend": 15,
    "updatedAt": "timestamp"
  }
  ```

#### 9. `trustScoreHistory`
- **Path**: `trustScoreHistory/{id}`
- **Purpose**: Historical trust score trend tracking.

#### 10. `assistantConversations`
- **Path**: `assistantConversations/{conversationId}`
- **Purpose**: Saved AI assistant chat history.

---

## 6. Storage & Gemini Integrations

### Firebase Storage
Digital files in `DocumentVault.jsx` are uploaded to Firebase Storage and associated with the existing document vault workflow. The app uses Firebase Storage security rules to protect cross-tenant exposure.

### Gemini API Integration
Gemini usage is routed through backend services for assistant and explanation flows. The front-end talks to these features via REST endpoints, which keeps the Android shell thin and compatible with Capacitor.

---

## 7. Android readiness notes
- Capacitor Android sync completed successfully.
- The manifest already includes the required location, internet, notification, and foreground service permissions.
- The app still depends on browser Web APIs for geolocation and voice alerts, so real-device testing is still required.
- Generated Android assets were excluded from ESLint to avoid false positives from synced bundles.

---

## 8. Validation performed
- `npm run lint` → passed with warnings only
- `npm run build` → passed
- `npx cap sync android` → passed
