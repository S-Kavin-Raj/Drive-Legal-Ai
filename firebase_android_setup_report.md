# Firebase Android Setup Report

## Current status
DriveLegal AI is already configured as a Capacitor Android app in the frontend workspace, but Firebase Android registration is not complete because the native Firebase config file is missing from the Android app folder.

### Verified
- Android platform exists at `frontend/android`
- Capacitor sync succeeds
- Web production build succeeds
- Android Gradle project is present
- Google Services plugin dependency is declared in the root Gradle file
- App Gradle file conditionally applies the Google Services plugin when `google-services.json` is present

### Missing
- `frontend/android/app/google-services.json`

## Package name
- Android package / applicationId: `com.drivelegal.ai`
- Android namespace: `com.drivelegal.ai`
- Capacitor appId: `com.drivelegal.ai`

## Firebase Console requirements
To complete Android Firebase registration, the app must be added in Firebase Console using the package name above.

### Required identifiers
- Package name: `com.drivelegal.ai`
- SHA-1 certificate fingerprint: required for some Firebase features and Android auth flows
- SHA-256 certificate fingerprint: required for stronger Android app identity and some Firebase/Google services workflows

### Required Firebase Console actions
1. Open Firebase Console for the existing project.
2. Add or verify the Android app using package name `com.drivelegal.ai`.
3. Register the SHA-1 and SHA-256 fingerprints from the signing keystore.
4. Download the generated `google-services.json` file.
5. Place the file at `frontend/android/app/google-services.json`.
6. Re-run Capacitor sync so the Android project picks up the config.

## Gradle verification
### `android/build.gradle`
Verified:
- `google()` repository is configured
- `com.google.gms:google-services:4.4.4` is declared in the buildscript classpath

### `android/app/build.gradle`
Verified:
- `applicationId` is `com.drivelegal.ai`
- The Google Services plugin is conditionally applied when `google-services.json` exists
- Capacitor and AndroidX dependencies are present

## Android shell Firebase compatibility
### Auth
- The current app uses Firebase Web SDK Auth in the WebView shell.
- Android compatibility is good for a Capacitor WebView build, but Firebase Console registration is still needed for a fully configured Android identity.

### Firestore
- Firestore is accessed through the web SDK.
- No native Firestore rewrite is required for the current app shell.

### Storage
- Firebase Storage is accessed through the web SDK.
- Android WebView compatibility is acceptable, assuming network and auth are functioning correctly.

### Geolocation
- Driving mode uses browser geolocation APIs.
- This is compatible with Capacitor WebView, but it still needs real-device Android testing.

## Required Firebase setup steps
1. Confirm `com.drivelegal.ai` in Firebase Console.
2. Capture SHA-1 and SHA-256 from the release/debug keystore used for signing.
3. Register those fingerprints in the Firebase Android app settings.
4. Download `google-services.json`.
5. Copy it to `frontend/android/app/google-services.json`.
6. Run `npx cap sync android`.
7. Open Android Studio and verify Gradle sync succeeds.
8. Test Firebase Auth, Firestore reads/writes, and Storage uploads on a physical device.

## Verification steps for Android after setup
- App launches in Android Studio without Gradle errors
- Firebase Auth signs in/out successfully
- Firestore reads and writes complete successfully
- Document uploads to Firebase Storage complete successfully
- GPS permissions prompt and location tracking work in Drive mode
- The app survives a cold start after native sync

## Notes
- No new features were introduced.
- No business logic was changed.
- This report only covers Android Firebase readiness.