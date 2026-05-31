# Backend

This folder contains the DriveLegal AI backend services (APIs, auth, OCR/AI orchestration, and legal workflow logic).

## Current services

- `GET /health`
- `GET /api/sample`
- `POST /api/auth/session`
- `POST /api/recommendations`
- `POST /api/route-risk`
- `POST /api/challan-ocr`
- `POST /api/compliance/evaluate`
- `GET /api/compliance/history/:userId`
- `POST /api/challan-ocr`
- `POST /api/awareness/evaluate`
- `GET /api/awareness/history/:userId`

## Compliance engine setup

The compliance engine reads and writes real Firestore data using the Firebase Admin SDK.

Required environment variables:

- `FIREBASE_PROJECT_ID`
- `JWT_SECRET` (required for backend session signing)
- `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_PATH`
- `COMPLIANCE_EXPIRY_WARNING_DAYS` (optional, default `30`)

Authentication flow:

1. The frontend signs in with Firebase.
2. The frontend exchanges the Firebase identity for a backend JWT via `POST /api/auth/session`.
3. The backend returns a 30-minute JWT containing `userId`, `email`, `role`, `iat`, and `exp`.
4. Protected API routes require `Authorization: Bearer <token>`.

Recommended run flow:

1. Populate `backend/.env`
2. Install dependencies
3. Start the server with `npm start`

The frontend dashboard calls the backend compliance API to calculate readiness and persist compliance history.

## Challan OCR setup

Upload a challan image or PDF using `POST /api/challan-ocr` with `multipart/form-data`.

Form fields:

- `file`: image or PDF
- `userId`: optional, used to persist challan to Firestore for the user

The backend will:

- Run OCR on the file
- Compute confidence
- Match traffic rules from Firestore `trafficRules`
- Persist output to `challanReports`

## Awareness engine

`POST /api/awareness/evaluate` will:

- Count actual activity from `routeAnalyses`, `complianceHistory`, and `challanReports`
- Compute awareness score and level
- Persist entries in `awarenessScores`
