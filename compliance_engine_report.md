# compliance_engine_report

This report documents the design, architecture, and verification results of the **Document Vault** and dynamic **Compliance Engine** integrated inside the **DriveLegal AI** mobile ecosystem.

---

## 1. Firestore Schema

Two critical collections support document uploads and compliance auditing:

### `documents` Collection (Storage Metadata Ledger)
Documents uploaded by drivers are saved in the `documents` collection with the following structure:
```json
{
  "userId": "string",
  "type": "license | insurance | puc | rc | fc",
  "fileUrl": "string (Firebase Storage download URL)",
  "expiryDate": "YYYY-MM-DD",
  "status": "Valid | Expiring Soon | Expired | Missing",
  "uploadedAt": "ServerTimestamp"
}
```

### `complianceHistory` Collection (Audits Record)
To track historical changes in driver credentials, evaluation runs log into the `complianceHistory` collection:
```json
{
  "userId": "string",
  "readinessScore": 75,
  "status": "Ready | Not Ready",
  "documentStatusMap": {
    "license": "Valid",
    "rc": "Valid",
    "insurance": "Expired",
    "puc": "Missing"
  },
  "issues": [
    { "type": "insurance", "status": "Expired", "message": "INSURANCE has expired." },
    { "type": "puc", "status": "Missing", "message": "PUC document is missing." }
  ],
  "expiringSoon": [],
  "documents": [
    { "id": "docId", "type": "license", "expiryDate": "YYYY-MM-DD", "uploadedAt": "Timestamp" }
  ],
  "evaluatedAt": "ServerTimestamp",
  "source": "compliance-engine"
}
```

---

## 2. Firebase Storage Integration

* **Isolated Credentials Paths**: Document files are stored in Firebase Storage inside structured, secure paths organized by user ID: `vault/{userId}/{type}_{Date.now()}_{filename}`.
* **Resumable Uploads & Callbacks**: Uses the Firebase Web SDK `uploadBytesResumable` utility. This yields live byte-transferred callbacks for high-fidelity progress percentage UI updates on upload cards.
* **URL Resolution**: Upon completion, retrieves the unique download URL via `getDownloadURL` and commits the metadata transaction to Firestore.

---

## 3. Dynamic Compliance Engine & Calculations

 we refactored the backend scoring algorithm in `backend/services/complianceEngine.js` to replace static SaaS calculations with dynamic, vehicle-specific compliance:

### Vehicle Checklist Routing
* **🏍️ Bike**: `License`, `Insurance`, `PUC` (3 required credentials)
* **🚗 Car**: `License`, `RC`, `Insurance`, `PUC` (4 required credentials)
* **🚛 Commercial**: `License`, `RC`, `Insurance`, `PUC`, `FC` (5 required credentials)

### Mathematical Compliance Score
* **readinessScore**: Calculated as the exact percentage of valid required documents for the user's registered vehicle type:
  $$\text{readinessScore} = \text{Math.round}\left( \frac{\text{Valid Required Documents}}{\text{Total Required Documents for Vehicle}} \times 100 \right)$$
* **status**: Set strictly to `'Ready'` only if all required credentials are valid. If any credential is `'Missing'`, `'Expired'`, or `'Invalid'`, the status returns `'Not Ready'`.
* **Expiring Soon Warnings**: Triggers an alert in `expiringSoon` if a valid document's expiration date is $\le 30$ days away.

---

## 4. On-Screen Interfaces Created

1. **Document Vault (`DocumentVault.jsx` page)**:
   * Displays the dynamic checklist required for the driver's vehicle type.
   * Renders large neon-framed purple upload cards.
   * Integrates an inline expiration date picker and visual upload progress bar tracking byte streams in real-time.
   * Exposes dynamic status pill badges (green neon for `VALID`, orange for `EXPIRING SOON`, red neon for `EXPIRED`).
2. **Dashboard HUD Enhancements (`Dashboard.jsx`)**:
   * **Replaced Mock Data**: Substituted onboarding checkboxes with the live database-driven `useCompliance()` hook.
   * **Document Quick Glance Panel**: Horizontal scroll list showing live uppercase tags (`LICENSE`, `RC`, `INSURANCE`) alongside current status indicators. Click on any item redirects straight to the Vault.
   * **Vault CTA**: Added a modern glowing list card next to Plan Trip for easy vault access.

---

## 5. Verification Sprint & Test Results

* **Checklist Customization**:
  * Car accounts successfully load `License`, `RC`, `Insurance`, `PUC`.
  * Bike accounts load exactly `License`, `Insurance`, `PUC`.
* **Lightweight DB Performance**:
  * Uploading a new document successfully updates Firestore `/documents`.
  * RTO AI Compliance Engine accurately calculates readiness scores (e.g. 75% for 3/4 documents valid on a Car profile).
  * Expiry calculations successfully alert drivers on `Expiring Soon` or `Expired` statuses.
* **Compilation Integrity**:
  * **Linter**: Successfully verified with `0 errors`.
  * **Vite Build**: Compiled production bundles flawlessly in `4.75s`.
