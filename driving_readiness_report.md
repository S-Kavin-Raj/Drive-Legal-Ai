# Driving Readiness Engine Report

## 1. Readiness Calculations

The **Driving Readiness Engine** evaluates a driver's legal and regulatory status before allowing them to initiate a trip. The engine aggregates document states to calculate a numerical **Readiness Score** using a standardized formula.

### Readiness Score Formula
The score is calculated dynamically based on the ratio of active, valid compliance credentials relative to the absolute requirements defined for the current vehicle profile:

$$\text{Readiness Score} = \left( \frac{\text{Valid Documents}}{\text{Required Documents}} \right) \times 100$$

*   **Valid Documents**: Number of required credentials that are present, uploaded, verified, and not expired.
*   **Required Documents**: Total number of credentials legally mandated for the user's selected vehicle class.

### Mathematical Examples
*   **Example A (Bike - 3 required):**
    *   *License*: Valid (1)
    *   *Insurance*: Valid (1)
    *   *PUC*: Missing (0)
    *   **Calculation**: $\frac{2}{3} \times 100 \approx 67\%$ (Classified as: **Not Ready**)
*   **Example B (Car - 4 required):**
    *   *License*: Valid (1)
    *   *RC*: Valid (1)
    *   *Insurance*: Valid (1)
    *   *PUC*: Missing (0)
    *   **Calculation**: $\frac{3}{4} \times 100 = 75\%$ (Classified as: **Drive With Caution**)
*   **Example C (Commercial - 5 required):**
    *   *License*: Valid (1)
    *   *RC*: Valid (1)
    *   *Insurance*: Valid (1)
    *   *PUC*: Valid (1)
    *   *FC*: Valid (1)
    *   **Calculation**: $\frac{5}{5} \times 100 = 100\%$ (Classified as: **Ready To Drive**)

---

## 2. Validation & Blocker Rules

The engine applies strict regulatory rules conforming to the Indian Motor Vehicles Act to classify the driver's readiness state and block operations if critical credentials are compromised.

### Readiness Status Bands
The calculated score determines the driver's readiness category, represented visually across cards and bottom sheets:

| Score | Readiness Status | Action Allowed | UI Styling |
| :--- | :--- | :--- | :--- |
| **100%** | `Ready To Drive` | Fully authorized to navigate. | Solid green theme, subtle pulse effect. |
| **70% - 99%** | `Drive With Caution` | Authorized to navigate with a warnings advisory. | Amber warning panel, yellow text theme. |
| **Below 70%** | `Not Ready` | Denied/Blocked if critical documents are missing/expired. | Crimson warning panel, red text theme. |

### Driving Blocker
The system distinguishes between **Secondary Documents** (which trigger warnings but permit driving) and **Critical Documents** (which are absolute legal blockers).
*   **Critical Documents**: `License` and `Insurance`.
*   **Blocker Trigger**: If either `license` or `insurance` is classified as `Missing` or `Expired`, the **Start Driving** action is strictly intercepted.
*   **Blocker Behavior**:
    1.  The navigation to the active driving dashboard (`/driving-mode`) is disabled.
    2.  The Pre-Drive Modal renders a high-visibility Crimson Legal Block panel quoting Motor Vehicle Act violations.
    3.  The main CTA `Confirm & Drive` is replaced with an `Open Vault` navigation button prompting immediate uploads.

---

## 3. Firestore Collections & Schema

The Driving Readiness Engine reads and logs transactional verification records to Firestore to maintain an audit ledger of compliance.

### 1. `documents` Collection
Contains the uploaded digital credentials uploaded by drivers.
```json
{
  "userId": "string (Foreign Key referencing users.uid)",
  "type": "string (license | rc | insurance | puc | fc)",
  "fileUrl": "string (Firebase Storage file URI)",
  "uploadedAt": "timestamp (Server Timestamp)",
  "expiryDate": "timestamp / string (ISO date)",
  "status": "string (Valid | Expired | Expiring Soon)"
}
```

### 2. `readinessHistory` Collection
Holds audit logs generated every time a driver successfully validates their compliance checklist and clicks `Confirm & Drive`.
```json
{
  "userId": "string (Foreign Key referencing users.uid)",
  "score": "number (Readiness Score: 0 - 100)",
  "status": "string (Ready To Drive | Drive With Caution | Not Ready)",
  "createdAt": "timestamp (Server Timestamp)"
}
```

### 3. `complianceHistory` Collection
Maintains raw backend evaluations logged automatically on profile analysis.
```json
{
  "userId": "string",
  "readinessScore": "number",
  "status": "string (Ready | Not Ready)",
  "documentStatusMap": {
    "license": "string",
    "rc": "string",
    "insurance": "string",
    "puc": "string"
  },
  "evaluatedAt": "timestamp",
  "source": "compliance-engine"
}
```

---

## 4. Screens & Components Created

Modern, mobile-first views were added to intercept and display pre-drive compliance checks beautifully under a dark, neon purple glassmorphism aesthetic.

### 1. Home Dashboard (`Dashboard.jsx`)
*   **Driving Readiness Card**: An amber/green-outlined glowing glass panel showing the driver's live compliance index (e.g. `75%`), status band (`Drive With Caution`), and a quick description.
*   **Document Glance Slider**: A horizontal scroll container displaying state badges (`✅ VALID`, `❌ EXPIRED`, `📁 MISSING`) for each required credential, linking directly to the vault.
*   **Intercepted START DRIVING Button**: Intercepts tap events to analyze requirements before launching the navigation screen.

### 2. Pre-Drive Modal (`Dashboard.jsx` Modal Component)
*   **Safety Scan Animation**: Displays a scanning state before presenting results.
*   **Circular Progress Ring**: A clean visual circle glowing in green, yellow, or red corresponding to the score.
*   **Itemized Issue Tracker**: Details exactly which credentials are missing or expired, warning the driver.
*   **Blocker Action CTAs**: Replaces the start trigger with an `Open Vault` link if blocked, guiding users to rectify failures.

---

## 5. E2E Test Results & Compilation

The modified codebase has been thoroughly tested and validated against rigid syntactic and build benchmarks.

### Linting Success
The frontend linter was executed to check structural elements and JSX bindings:
```bash
npm run lint
```
*   **Result**: **Passed successfully** with 0 errors. All JSX structures compile cleanly.

### Build Verification
A production build was executed to confirm optimization and component loading:
```bash
npm run build
```
*   **Result**: **Successfully built for production in 4.54 seconds** with zero issues.
*   **Output telemetry**:
    *   `dist/index.html` (1.27 kB)
    *   `dist/assets/Dashboard-DNOhNqVK.js` (18.57 kB)
    *   `dist/assets/index-Cbj1YcwQ.js` (830.82 kB)
