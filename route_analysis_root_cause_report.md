# DriveLegal AI — Route Analysis Root-Cause Report

## Executive summary

DriveLegal AI currently uses a **mixed route-analysis architecture**:

- **Frontend still calls OpenRouteService directly** for place autocomplete and geocoding.
- **Backend already exposes a route-analysis endpoint** at `POST /api/route-risk`.
- The frontend still expects `VITE_ORS_API_KEY` because ORS is still being used in-browser for place lookup / coordinate normalization before the backend route-risk request is sent.

So the root cause is **not** that the backend endpoint is missing. The root cause is that the frontend has only partially migrated away from direct ORS usage.

## Current route-analysis flow

```mermaid
flowchart TD
  A[PlanTrip / JourneyPlanner UI] --> B[orsService.js]
  B --> C[OpenRouteService Geocoding API]
  C --> D[Normalized coordinates]
  D --> E[routeService.js]
  E --> F[apiClient.post('/api/route-risk')]
  F --> G[Railway backend /api/route-risk]
  G --> H[backend/controllers/routeController.js]
  H --> I[OpenRouteService Directions API]
  I --> J[route analysis + risk scoring + intelligence]
```

## Files that reference `VITE_ORS_API_KEY`

### Frontend source files

- `frontend/src/main.jsx:9-12`
  - Reads `VITE_ORS_API_KEY` from `localStorage`
  - Copies it into `import.meta.env.VITE_ORS_API_KEY` when missing
- `frontend/src/services/orsService.js:3,9,39,43`
  - Defines `ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY || ''`
  - Logs / throws when the key is missing
  - Uses the key in OpenRouteService geocoding requests
- `frontend/src/components/OrsKeyDiagnostic.jsx:12,33,39,40,50,68`
  - Saves the key into `localStorage`
  - Explains that ORS is required for journey planning / route analysis
  - Shows the `.env` variable name to the user

### Generated frontend artifacts that also contain the string

These are build outputs / synced Android assets that mirror the same source logic:

- `frontend/dist/assets/*.js`
- `frontend/android/app/src/main/assets/public/assets/*.js`
- `frontend/android/app/build/intermediates/assets/debug/mergeDebugAssets/public/assets/*.js`

## Files that reference OpenRouteService / ors / route analysis / route planning

### Direct ORS usage in the frontend

- `frontend/src/services/orsService.js:3-58`
  - Direct calls to `https://api.openrouteservice.org/geocode/autocomplete`
  - Direct calls to `https://api.openrouteservice.org/geocode/search`
- `frontend/src/pages/PlanTrip.jsx:7,150-151,351,369`
  - Imports `fetchPlaceSuggestions`
  - Shows route analysis UI and error handling
- `frontend/src/components/JourneyPlanner/index.jsx:3`
  - Imports `fetchPlaceSuggestions`
- `frontend/src/components/MapSection/index.jsx:32,54`
  - Comments reference ORS-style coordinates and route geometry
- `frontend/src/services/mapboxService.js:1`
  - Notes migration to OpenRouteService

### Route analysis and planning entry points

- `frontend/src/services/routeService.js:2,9`
  - Imports `fetchPlaceCoordinates`
  - Sends route-analysis payload to backend via `apiClient.post('/api/route-risk', ...)`
- `frontend/src/hooks/useRouteAnalysis.js:1-40`
  - Subscribes to saved route analyses from Firestore
- `frontend/src/hooks/useDashboard.js:48`
  - References active route analysis state

## Backend route-analysis endpoint status

Yes — a backend route-analysis endpoint already exists.

### Exact endpoint

- `POST /api/route-risk`
- Effective production URL: `https://drive-legal-ai-production.up.railway.app/api/route-risk`

### Where it is registered

- `backend/index.js:165`
  - `app.post('/api/route-risk', requireAuth, validateRouteRequest, handleRouteAnalysis)`

### Where the full processing logic lives

- `backend/controllers/routeController.js:111-248`
  - Validates coordinates
  - Calls OpenRouteService Directions API on the server
  - Computes risk score, route intelligence, and recommendations
  - Persists analysis via `routeAnalysisStore`

### Related backend route-intelligence endpoint

- `POST /api/route-intelligence/evaluate`
- Effective production URL: `https://drive-legal-ai-production.up.railway.app/api/route-intelligence/evaluate`
- Registered via `backend/index.js:42`
- Implemented in `backend/controllers/routeIntelligenceController.js:1-26`

### Persistence layer

- `backend/services/routeAnalysisStore.js:3-22`
  - Stores simplified route analyses in Firestore

## Why the frontend is still expecting `VITE_ORS_API_KEY`

Because the frontend still performs **client-side ORS geocoding** before it calls the backend route-risk endpoint.

The key evidence is:

1. `frontend/src/services/orsService.js` reads `import.meta.env.VITE_ORS_API_KEY`.
2. `PlanTrip.jsx` and `JourneyPlanner/index.jsx` both import `fetchPlaceSuggestions()` from `orsService.js`.
3. `frontend/src/main.jsx` provides a `localStorage` fallback for `VITE_ORS_API_KEY`.
4. `frontend/src/components/OrsKeyDiagnostic.jsx` instructs the user to add an ORS key.

That means the frontend is **not purely backend-proxied** for ORS operations. It still needs a browser-visible ORS key for autocomplete and geocoding.

## Root cause

The root cause is a **partial migration**:

- Route risk analysis itself is already backend-based.
- ORS geocoding/autocomplete is still frontend-based.

So the app still needs `VITE_ORS_API_KEY` until those browser calls are removed or proxied.

## Recommended correct architecture

### Preferred architecture

Move **all OpenRouteService calls to the Railway backend** and make the frontend call only your backend.

#### Recommended flow

1. Frontend sends source/destination text to Railway.
2. Backend geocodes addresses using ORS with `ORS_API_KEY` stored only on the server.
3. Backend performs routing / risk analysis.
4. Frontend receives the normalized route payload from Railway.

### Benefits

- No browser-exposed ORS key
- One central place for ORS rate limiting and error handling
- Easier Android Capacitor support
- Cleaner separation between UI and routing logic

### What to avoid

- Do not keep a browser-side `VITE_ORS_API_KEY` if the goal is a fully backend-owned ORS integration.
- Do not mix direct ORS calls in the frontend with backend proxy calls unless there is a deliberate product reason.

## Conclusion

The backend route-analysis endpoint already exists and is reachable as `POST /api/route-risk`.

The frontend still expects `VITE_ORS_API_KEY` because **ORS geocoding is still happening in the browser** via `orsService.js`, `PlanTrip.jsx`, `JourneyPlanner/index.jsx`, and the ORS key diagnostic flow.

The correct long-term architecture is to proxy all ORS work through the Railway backend and remove browser-side dependence on `VITE_ORS_API_KEY`.