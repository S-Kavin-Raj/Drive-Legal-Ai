# Phase 11 — Driver Trust Score Engine Report

> **Score Range:** 300 – 900  |  **No mock data.**  |  **All computations from real Firestore data.**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   trustScoreEngine.js (Backend)             │
│                                                             │
│  calculateTrustScore(userId)                                │
│    ├── computeComplianceScore()   → 25% weight             │
│    ├── computeDrivingScore()      → 35% weight             │
│    ├── computeChallanScore()      → 25% weight             │
│    └── computeConsistencyScore()  → 15% weight             │
│                                                             │
│  Weighted → scaleToRange(0-100 → 300-900) → grade          │
│                                                             │
│  getTrustScoreData(userId)       → read or compute         │
│  recalculateUserTrustScore(uid)  → compute + persist       │
└─────────────────────────────────────────────────────────────┘
          │ Firestore writes
          ▼
  trustScores/{uid}          ← current score document
  trustScoreHistory/{id}     ← delta log entries
```

---

## Score Range & Grades

| Score | Grade | Level (Dashboard) |
|-------|-------|-------------------|
| 900 | Excellent | Elite Driver |
| 800–899 | Very Good | Elite Driver |
| 700–799 | Good | Safe Driver |
| 600–699 | Moderate Risk | Average Driver |
| 500–599 | High Risk | Risk Driver |
| <500 | Unsafe | High Risk Driver |

---

## Sub-Score Breakdown

### 1. Compliance Score (25% weight)

**Data Source:** `evaluateComplianceForUser(userId)` → backend compliance engine

| Signal | Impact |
|--------|--------|
| Valid documents | Positive — increases raw score |
| Expired documents | −15 points per expired doc |
| Missing documents | −10 points per missing doc |
| 100% compliance | Factor: "All required vehicle credentials are 100% valid." |

---

### 2. Driving Behavior Score (35% weight)

**Data Source:** `drivingEvents` collection

| Event Type | Penalty |
|------------|---------|
| `SPEED_WARNING` | −8 points each |
| `OFF_ROUTE` | −10 points each |
| `SCHOOL_ZONE` | −5 points each |
| `HOSPITAL_ZONE` | −5 points each |
| `ACCIDENT_ZONE` | −5 points each |
| Zero violations | Factor: "Zero driving violations recorded." |

---

### 3. Challan History Score (25% weight)

**Data Source:** `challanReports` collection

| Signal | Penalty |
|--------|---------|
| Overdue challan | −20 points each |
| Unpaid challan (non-overdue) | −10 points each |
| Suspicious challan | −15 points each |
| Zero citations | Factor: "Clean driving record — zero citations." |
| All paid | Factor: "All N challan(s) paid in full." |

---

### 4. Driving Consistency Score (15% weight)

**Data Source:** `drivingSessions` collection (status = 'Completed')

| Signal | Effect |
|--------|--------|
| Average safety score | Base (0-100) |
| Safe sessions ratio (≥80 score) | Up to +15 bonus |
| Trip volume | Up to +10 bonus (1pt per trip) |
| No trips | Neutral: raw = 50 |
| ≥80% safe sessions | Factor: "N/M sessions rated safe." |
| ≥5 completed trips | Factor: "N trips completed — consistent driver." |

---

## Firestore Schema

### Collection: `trustScores/{userId}`

```json
{
  "userId":           "string",
  "trustScore":       "number (300–900)",
  "score":            "number (alias — backward compat)",
  "grade":            "Excellent | Very Good | Good | Moderate Risk | High Risk | Unsafe",
  "level":            "Elite Driver | Safe Driver | Average Driver | Risk Driver | High Risk Driver",
  "complianceScore":  "number (300–900)",
  "drivingScore":     "number (300–900)",
  "challanScore":     "number (300–900)",
  "consistencyScore": "number (300–900)",
  "breakdown":        "{ compliance, driving, challan, consistency } — detailed with raw, weight, details",
  "factors":          "{ positive: string[], negative: string[] }",
  "achievements":     "{ id, title, description }[]",
  "lastCalculatedAt": "ISO 8601 string"
}
```

### Collection: `trustScoreHistory/{id}`

```json
{
  "userId":         "string",
  "previousScore":  "number",
  "currentScore":   "number",
  "change":         "number (delta)",
  "reason":         "string",
  "createdAt":      "ISO 8601 string"
}
```

---

## Trigger Points

| Trigger | Location | Method |
|---------|----------|--------|
| Driving session completed | [DrivingMode.jsx:514](file:///d:/Drive_Legal_Ai/frontend/src/pages/DrivingMode.jsx) | `recalculateTrustScore(user.uid)` |
| Challan added (OCR scan) | [ChallanManager.jsx:203](file:///d:/Drive_Legal_Ai/frontend/src/pages/ChallanManager.jsx) | `import(...).then(m => m.recalculateTrustScore(...))` |
| Challan marked paid | [ChallanManager.jsx:140](file:///d:/Drive_Legal_Ai/frontend/src/pages/ChallanManager.jsx) | `import(...).then(m => m.recalculateTrustScore(...))` |
| Document uploaded | [DocumentVault.jsx:173](file:///d:/Drive_Legal_Ai/frontend/src/pages/DocumentVault.jsx) | `import(...).then(m => m.recalculateTrustScore(...))` |
| Onboarding completed | [Onboarding.jsx:241](file:///d:/Drive_Legal_Ai/frontend/src/pages/Onboarding.jsx) | `import(...).then(m => m.recalculateTrustScore(...))` |
| Dashboard load | [Dashboard.jsx:162](file:///d:/Drive_Legal_Ai/frontend/src/pages/Dashboard.jsx) | `fetchTrustScore(user.uid)` (read-only, calculates on first load) |
| Manual recalculation | `POST /api/trust-score/recalculate` | Backend API |

> [!NOTE]
> Document expiry is evaluated dynamically at recalculation time — the compliance engine checks all document `expiryDate` fields against `Date.now()`. No separate cron is needed.

---

## Dashboard Integration

### Trust Score Card — Updated

| Element | Before | After |
|---------|--------|-------|
| Score display | `trustScore.score` (0-100) | `trustScore.trustScore` (300-900) with grade color |
| Grade label | Hidden | Shown below score (`Excellent` / `Good` / etc.) |
| Trend indicator | Missing | `▲ +N pts` / `▼ −N pts` badge when `change ≠ 0` |
| Breakdown bars | Missing | **NEW** — 4 colored progress bars (Compliance, Driving, Challans, Consistency) |
| Score color | Always purple | Dynamic: green ≥700, amber ≥500, red <500 |
| Factors | Same | Same (positive ✓ / negative ⚠) |
| Achievements | Same | Same (earned badges) |

---

## Files Modified / Created

| File | Change | Purpose |
|------|--------|---------|
| [trustScoreEngine.js](file:///d:/Drive_Legal_Ai/backend/services/trustScoreEngine.js) | **REWRITTEN** | 300-900 scoring with 4 weighted sub-scores |
| [trustScoreController.js](file:///d:/Drive_Legal_Ai/backend/controllers/trustScoreController.js) | **UPDATED** | Uses new `getTrustScoreData()` function |
| [Dashboard.jsx](file:///d:/Drive_Legal_Ai/frontend/src/pages/Dashboard.jsx) | **UPDATED** | New trust card with breakdown bars, grade, trend |
| [ChallanManager.jsx](file:///d:/Drive_Legal_Ai/frontend/src/pages/ChallanManager.jsx) | **UPDATED** | Added triggers after paid + OCR scan |
| [DocumentVault.jsx](file:///d:/Drive_Legal_Ai/frontend/src/pages/DocumentVault.jsx) | **UPDATED** | Added trigger after document upload |
| [Onboarding.jsx](file:///d:/Drive_Legal_Ai/frontend/src/pages/Onboarding.jsx) | **UPDATED** | Added trigger after onboarding + cleaned debug logs |

---

## Quality Gate Results

```
npm run lint   →  0 errors, 87 warnings  ✅ PASS
npm run build  →  1926 modules, built in 7.04s  ✅ PASS
```

---

## Example Score Calculation

**User with:**
- 3/4 docs valid, 1 expired → Compliance raw = 85 - 15 = 70
- 2 speed violations, 1 off-route → Driving raw = 100 - 16 - 10 = 74
- 1 unpaid challan (not overdue) → Challan raw = 100 - 10 = 90
- 3 completed trips, 2 safe (avg score 82) → Consistency raw = 82 + 10 + 3 = 95

Weighted normalised = 0.25(70) + 0.35(74) + 0.25(90) + 0.15(95) = 17.5 + 25.9 + 22.5 + 14.25 = **80.15**

Trust Score = 300 + (80/100) × 600 = **781** → **Grade: Good** → **Level: Safe Driver**
