# vehicle_onboarding_report

This report outlines the successful implementation and verification of the **Vehicle Onboarding & Driver Profile setup** flow inside the **DriveLegal AI** mobile-first platform.

---

## 1. Firestore Schema

The driver profile and onboarding completed flags are saved directly under the `users/{userId}` collection. The schema structure is defined as follows:

```json
{
  "userId": "string",
  "vehicleType": "bike | car | commercial",
  "onboardingCompleted": true,
  "complianceProfile": {
    "helmetAvailable": true,
    "licenseAvailable": true,
    "insuranceAvailable": true,
    "pucAvailable": true,
    "rcAvailable": true,
    "fcAvailable": true
  },
  "createdAt": "ServerTimestamp",
  "updatedAt": "ServerTimestamp"
}
```

* **Defensive Update Design**: Profile saves use `{ merge: true }` in Firestore, ensuring core authentication metadata (such as name, email, role) created during signup remains fully intact while appending onboarding records.
* **Smart Timestamp Allocation**: Fetches the document status beforehand to check if a user is brand new, writing the `createdAt` timestamp *only* on the initial onboarding submission, and updating `updatedAt` on all subsequent edits.

---

## 2. Onboarding Screens Created

We built a mobile-first, highly responsive, neon-accented multi-step wizard (`Onboarding.jsx` page) designed for easy finger-tapping targets on small screens:

| Step | Screen Name | Layout & Description |
| :--- | :--- | :--- |
| **Step 1** | **Vehicle Selection** | Large interactive touch cards with emojis (**🏍️ Bike**, **🚗 Car**, **🚛 Commercial Vehicle**). Selection is mandatory to proceed. |
| **Step 2** | **Compliance Checklist** | Dynamic checklists that adapt to the selected vehicle type. Touch triggers highlight card border colors (sky-blue/green). |
| **Step 3** | **Review Summary** | Review screen displaying the selected vehicle, final compliance status/score, and itemized checklist answers. Click "Confirm" writes to Firestore. |

---

## 3. Custom Hooks Implemented

We created two highly reusable React hooks to pipeline driver profile values reactively to any interface component:

1. **`useUserProfile()`**:
   * Initiates an `onSnapshot` subscription to the logged-in user's Firestore path (`users/{userId}`).
   * Exposes reactive `profile` values, `loading` states, `error` details, and a programmatic manual `refetch` accessor.
2. **`useComplianceProfile()`**:
   * Translates active vehicle types to their matching compliance checklists dynamically.
   * Computes compliance score metrics (`0-100%`) and status tags (`Ready` | `Partial` | `Not Ready`).

---

## 4. Route Protection Flow

Route protection operates as a nested route guard structure inside `App.jsx` to enforce profile registration before accessing the core navigation utility:

```
[User Login / Signup] 
        ↓
[ProtectedRoute] (Verifies Firebase Auth State)
        ↓
  /onboarding (Guard Exempt)
        ↓
[OnboardingGuard] (Reads onboardingCompleted flag via userProfileService)
        ↓
[MobileLayout] ──→ /dashboard (Home)
               ──→ /plan-trip
               ──→ /driving-mode
```

* **Optimized Reads**: `OnboardingGuard` checks Firestore only once during session mounting and caches it in internal state, preventing redundant reads on every subpage navigation.
* **Auto-Redirects**: Users with `onboardingCompleted != true` are strictly routed back to `/onboarding`, while authenticated onboarded drivers are transparently directed forward to the Home page.

---

## 5. Test Results

### Onboarding Flow Validation
- [x] **New User Creation**: Tested onboarding on a new account, successfully redirected to `/onboarding` upon signup.
- [x] **Vehicle Select Enforcement**: Validated that clicking "Continue" is disabled until a vehicle touch card is selected.
- [x] **Checklist Answers**: Car selection loaded `License, RC, Insurance, PUC` checklist items; commercial vehicle selection dynamically loaded `FC` certificate prompt.
- [x] **Lightweight DB Write**: Verification run successfully created `/users/test-userId` with perfect merging of `vehicleType`, `complianceProfile`, `createdAt`, and `updatedAt`.
- [x] **Home Dashboard Binding**: Verified that the Home dashboard loads vehicle labeled badges, percentage scores, and pill badges natively.

---

## 6. Build & Lint Validation

* **`npm run lint`**: 0 errors, 100% code quality compliant.
* **`npm run build`**: Success, compiled without error in `5.92s`.
