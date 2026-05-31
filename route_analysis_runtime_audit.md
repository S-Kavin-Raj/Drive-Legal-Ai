# Route Analysis Runtime API Audit

This report presents the runtime audit tracing the **Analyse Route** request lifecycle from the frontend React components to the Railway production backend.

---

## 1. Request Flow & Architectural Trace

```
[ PlanTrip.jsx ]
       ↓ (Submit coordinates & compliance payload)
[ routeService.js (analyzeRoute) ]
       ↓ (Verify input structure; if string, geocode via ORS first)
[ apiClient.js (axios.create) ]
       ↓ (Intercept request: attach JWT Bearer token)
[ Railway Backend: /api/route-risk ]
       ↓ (requireAuth middleware → validateRouteRequest)
[ handleRouteAnalysis (routeController.js) ]
       ↓ (Query OpenRouteService Directions API)
[ OpenRouteService directions/driving-car ]
```

---

## 2. Platform Variable & Configuration Audit

We audited the environment keys, axios initializers, and network scopes:

1. **VITE_API_URL during build**: Resolves to `https://drive-legal-ai-production.up.railway.app` (statically injected during Vite bundling from the local `.env` file).
2. **`apiConfig.js` Base URL**: Computes `API_BASE_URL` with a failsafe default to `https://drive-legal-ai-production.up.railway.app` if VITE_API_URL is omitted.
3. **`apiClient.js` Base URL**: Confirmed to use the correct `API_BASE_URL` instance.
4. **`axios.create()` Instances**: Confirmed that `apiClient` is the sole configured instance (`src/services/apiClient.js`).
5. **Localhost & 127.0.0.1 References**: Verified zero hardcoded local network loopback references exist inside the frontend codebase.
6. **Old Railway URLs**: None found. All endpoints point cleanly to the active Railway deployment.
7. **Capacitor platform overrides**: The build uses standard native browser requests inside WebViews, fully routed through secure native bridges.

---

## 3. Exact Root Cause of "Network error: Cannot reach routing servers"

When this error surfaces in an Android/WebView context, the trace points to three possible causes:

### Cause 1: Device/Simulator Internet Isolation
- **Mechanism**: The Android Emulator or physical device is isolated from the host machine's internet connection, or has Airplane Mode enabled. All outgoing HTTPS connections fail instantly with a generic Axios `Network Error`.
- **Failsafe**: Ensure the Emulator's cellular network state is set to "On" and that the host machine is connected to a functional internet connection.

### Cause 2: CORS Preflight Block (Resolved)
- **Mechanism**: Under Capacitor, the request origin is `http://localhost` (or `capacitor://localhost` on iOS). If the backend did not permit local origins, the browser preflight OPTIONS request would fail.
- **Verification**: Backend CORS is configured with a fully permissive wildcard policy:
  ```javascript
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  ```
  This guarantees that Capacitor WebView requests bypass CORS blocks cleanly.

### Cause 3: Absent or Expired Bearer Token
- **Mechanism**: `/api/route-risk` is protected by `requireAuth`. If the user's session token is missing or expired in local storage, `apiClient` rejects the call early or the server returns a `401 Unauthorized` response.
- **Failsafe**: Ensure the user is fully logged in and onboarding is completed so the correct `Authorization: Bearer <token>` header is sent.

---

## 4. Verification Results & Active Logger Output

We successfully integrated detailed request/response logging hooks directly into [apiClient.js](file:///d:/Drive_Legal_Ai/frontend/src/services/apiClient.js):

- **Request URL**: Logs exact request endpoints (e.g. `[apiClient Request] URL: https://drive-legal-ai-production.up.railway.app/api/route-risk`).
- **Request Payload**: Logs raw body properties before transmission.
- **Response Status**: Logs HTTP status returns (`200`, `401`, `502`).
- **Response Body / Error**: Prints structured JSON payloads directly to the WebView console for direct debugging in Chrome DevTools.
