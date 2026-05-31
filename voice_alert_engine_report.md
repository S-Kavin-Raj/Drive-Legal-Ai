# DriveLegal AI — Phase 8 Report: Voice Alert Engine

This report details the speech synthesis architecture, real-time alert dispatchers, 60-second rate-limiting deduplication, Firestore-persisted togglers, and verification test results compiled for **Phase 8: Voice Alert Engine**.

---

## 1. Speech Synthesis Voice Architecture

We designed a clean Speech Synthesis wrapper in the frontend service directory: [voiceEngine.js](file:///d:/Drive_Legal_Ai/frontend/src/services/voiceEngine.js) mapping standard **W3C Speech Synthesis APIs**.

### A. Web Speech API Integration
* **Utterance Controls**: Utilizes `window.speechSynthesis` and `SpeechSynthesisUtterance` to instantiate custom text-to-speech instances.
* **Overlapping Speech Prevention**: Call `window.speechSynthesis.cancel()` before every new alert request to immediately terminate any current speech, avoiding muddy overlapping announcements and maintaining a clean auditory queue.
* **Volume and Rate Tuning**: Configured to full volume (`volume = 1.0`) and natural pace speed (`rate = 1.0`).

### B. Multi-Language Architecture (English, Tamil, Hindi)
* Standardized language mappings dynamically matching browser voice settings via `window.speechSynthesis.getVoices()`:
  * 🇬🇧 **English (en)**: Maps to `en-IN` (Indian English) or falls back to `en-US`.
  * 🇮🇳 **Tamil (ta)**: Maps to `ta-IN` (Tamil India) prepared vocabulary.
  * 🇮🇳 **Hindi (hi)**: Maps to `hi-IN` (Hindi India) prepared vocabulary.

---

## 2. Compliance Alerts & HUD Integration

The Voice Engine service is integrated directly into [DrivingMode.jsx](file:///d:/Drive_Legal_Ai/frontend/src/pages/DrivingMode.jsx) telemetry checks:

1. **GPS Telemetry Updates**: On every position change, the vehicle's position is cross-checked against planned route vertices and Firestore compliance zones.
2. **Alert Triggers & Messages**:
   * 🏫 **School Zone** (entered active zone $\le 150\text{m}$):
     * *Spoken text*: `"School zone ahead. Reduce speed."`
   * 🏥 **Hospital Zone** (entered active zone $\le 150\text{m}$):
     * *Spoken text*: `"Hospital zone ahead. Avoid honking."`
   * ⚠️ **Accident Hazard** (entered active zone $\le 150\text{m}$):
     * *Spoken text*: `"Accident-prone area ahead. Drive carefully."`
   * ⚡ **Speed Corridor** (entered active zone $\le 150\text{m}$):
     * *Spoken text*: `"Speed restriction zone ahead."`
   * 🛑 **Off-Route** (deviated path $> 200\text{m}$):
     * *Spoken text*: `"You are off the planned route."`

---

## 3. Rate-Limiting Deduplication Logic (60s Window)

Spamming spoken notifications on every GPS tick (which updates every 1.5 seconds) leads to extreme audio clutter. We built a deterministic **60-second rate suppression** algorithm inside `voiceEngine.js`:

* **Suppression Cache**: An in-memory `lastSpoken` object maps alert keys (`SCHOOL_ZONE`, `OFF_ROUTE`, etc.) to epoch millisecond timestamps.
* **Evaluation Math**:
  ```javascript
  const now = Date.now();
  if (lastSpoken[type] && (now - lastSpoken[type] < 60000)) {
    return; // Suppress speaking request
  }
  lastSpoken[type] = now;
  ```

This guarantees that each category of driving warning is announced at most **once every 60 seconds**, protecting the driver's focus.

---

## 4. Firestore Settings Persistency

Compliance voice alerts are connected to the user profile settings, giving drivers control:
* **Interactive Settings Page ([Settings.jsx](file:///d:/Drive_Legal_Ai/frontend/src/pages/Settings.jsx))**:
  * Employs the `useUserProfile` hook to read preferences reactively from Firestore.
  * Displays a custom neon switch toggling Voice Alerts. Toggles write directly to `users/{userId}/settings` via the `updateUserSettings` service.
  * Allows cycling language options among English, Tamil, and Hindi, persisting selections directly inside Firestore.
* **Instant Dynamic Syncing**:
  `DrivingMode.jsx` subscribes to the profile settings hook. If `settings` change or if alerts are toggled off in settings, the voice alerts engine is dynamically updated:
  ```javascript
  setVoiceAlertsEnabled(profile.settings.voiceAlerts !== false);
  setVoiceLanguage(profile.settings.language || 'en');
  ```

---

## 5. E2E Test & Compiler Results

### A. Compliance & Rate-Limit Test (`verify_voice_alerts.js`)
We ran our verification script in the backend environment to assert database configuration persistence and rate suppression limits:

```bash
> node verify_voice_alerts.js
```

**Console Output Logs**:
```text
Firebase Admin initialized successfully in production mode.
=== STARTING VOICE ENGINE COMPLIANCE & RATE-LIMIT VERIFICATION ===

--- TEST 1: Persisting Voice Settings in Firestore ---
SUCCESS: Voice settings saved correctly in Firestore. ✅
- Stored Language Parameter: "ta"

--- TEST 2: E2E Rate Limiting Deduplication (60s suppression) ---
- Triggering First School Zone entry alert:
  * SPOKEN: "School zone ahead. Reduce speed." (Announced successfully)

- Triggering Second School Zone repeat alert (1s later):
  * SUPPRESSED: Spoken alert "SCHOOL_ZONE" is within 60s window. Skipping Speech Synthesis.

- Triggering Accident Zone entry alert:
  * SPOKEN: "Accident-prone area ahead. Drive carefully." (Announced successfully)

- Final Spoken Tally: 2 spoken, 1 suppressed.
SUCCESS: Deduplication rate suppression operates cleanly. ✅

=== ALL VOICE ENG COMPLIANCE TESTS PASSED SUCCESSFULLY ===
```

### B. Compile Gates Health Check
* **Linter (`npm run lint`)**: Passed with **0 errors**.
* **Vite Production Compile (`npm run build`)**: Compiled successfully in **4.70s** with **zero errors**.
