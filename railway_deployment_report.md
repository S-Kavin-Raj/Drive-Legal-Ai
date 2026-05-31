# Railway Deployment Report — DriveLegal AI Backend

## A. Required variables
Audited across `backend/index.js`, `controllers/`, `routes/`, `services/`, and `middleware/`.

### Startup / runtime variables discovered
- `ORS_API_KEY` — hard-required at startup in `backend/index.js`; server exits if missing
- `PORT` — optional; defaults to `4000`

### Firebase / authentication variables discovered
- `FIREBASE_PROJECT_ID` — used by Firebase Admin initialization and JWT fallback logic
- `FIREBASE_SERVICE_ACCOUNT_JSON` — production-friendly Firebase Admin credential source
- `FIREBASE_SERVICE_ACCOUNT_PATH` — alternative credential source
- `GOOGLE_APPLICATION_CREDENTIALS` — alternative credential source for application default credentials
- `JWT_SECRET` — JWT signing secret used by backend session tokens

### Gemini / AI variables discovered
- `GEMINI_API_KEY` — used by traffic assistant and trust score explainer services

### Operational tuning variables discovered
- `COMPLIANCE_EXPIRY_WARNING_DAYS` — compliance alert threshold
- `CHALLAN_OCR_MAX_FILE_MB` — challan upload size limit
- `OCR_LANGUAGE` — OCR language selection

## B. Railway root directory
Recommended Railway root directory:
- `backend`

Reason:
- The backend entry point is `backend/index.js`
- `backend/package.json` contains the startup script
- The backend has its own `.env`, routes, controllers, middleware, and service layers
- No Railway-specific config file (`railway.json`, `Procfile`, or similar) was found in the backend folder

## C. Health check URL
Verified health endpoint:
- `GET /health`

Expected Railway health check URL:
- `https://<your-railway-domain>/health`

Local verification URL:
- `http://localhost:4000/health`

## D. Startup command
Verified script:
- `npm start`

Equivalent command used by the package script:
- `node index.js`

## Environment-variable audit by area

### `index.js`
- `ORS_API_KEY`
- `PORT`

### Controllers
- `ORS_API_KEY` in route analysis controller
- No additional startup-critical environment variables were found in controller startup paths beyond service dependencies

### Services
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `FIREBASE_SERVICE_ACCOUNT_PATH`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `FIREBASE_PROJECT_ID`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `COMPLIANCE_EXPIRY_WARNING_DAYS`
- `OCR_LANGUAGE`

### Middleware
- No direct environment-variable usage found in backend middleware files during the audit

## Production readiness score
- **82 / 100**

### Why this score
Strengths:
- Clear entry point and stable `npm start` boot path
- Health endpoint already exists
- Firebase Admin can initialize in production mode when credentials are present
- Railway-friendly folder separation is already in place (`backend` is self-contained)

Deductions:
- `ORS_API_KEY` is a hard startup blocker if missing
- No `dev` script is defined for faster local parity checks
- Railway deployment still depends on setting the correct secrets manually
- Firebase and Gemini features require correct environment provisioning for full production capability

## Deployment blockers
### Hard blockers
- Missing `ORS_API_KEY` will stop the server from starting

### Conditional blockers
- Missing Firebase credentials will force offline/mock behavior instead of full Firestore-backed production behavior
- Missing `FIREBASE_PROJECT_ID` may reduce Firebase Admin reliability depending on credential source
- Missing `GEMINI_API_KEY` will reduce assistant/trust-score explanation functionality
- Missing `JWT_SECRET` weakens production token security because the code falls back to a non-production default path

### Not blockers, but worth noting
- `dev` script is absent
- No Railway config file was found, so Railway root directory must be set manually to `backend`

## Complete deployment variable list
Use this list as the Railway secrets/environment checklist:
- `ORS_API_KEY`
- `PORT`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `FIREBASE_SERVICE_ACCOUNT_PATH`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `COMPLIANCE_EXPIRY_WARNING_DAYS`
- `CHALLAN_OCR_MAX_FILE_MB`
- `OCR_LANGUAGE`

## Conclusion
The backend is structurally ready for Railway deployment with `backend` as the root directory and `npm start` as the startup command. The main deployment gate is ensuring `ORS_API_KEY` and the Firebase/Gemini production secrets are configured correctly in Railway.