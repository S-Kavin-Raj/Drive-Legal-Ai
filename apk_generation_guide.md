# APK Generation Guide

## 1. Open Android Studio
Use the existing Capacitor Android project in `frontend/android`.

Suggested entry point:
- Open the `frontend/android` folder in Android Studio

## 2. Sync Gradle
Before building, let Android Studio finish Gradle sync.

If you are refreshing from the web app build, use:
- `npx cap sync android`

## 3. Build APK
In Android Studio:
- Wait for Gradle sync to complete
- Choose the build variant you want
- Use the Build menu to generate the APK

## 4. Debug APK path
Typical debug APK output path:
- `frontend/android/app/build/outputs/apk/debug/app-debug.apk`

## 5. Release APK path
Typical release APK output path:
- `frontend/android/app/build/outputs/apk/release/app-release.apk`

## 6. Device testing checklist
Before publishing or sharing the APK, verify on a real Android device:
- App launches correctly
- Login and signup work
- Firestore data loads correctly
- Document uploads work
- Driving mode can request and receive location permission
- Geolocation updates appear in the live drive flow
- Voice alerts trigger correctly
- Challan and notification screens render without layout issues
- Offline or weak-network behavior is acceptable
- App resumes correctly after backgrounding

## 7. Release prep notes
- Keep the existing package name `com.drivelegal.ai`
- Use the Firebase Android config file in `frontend/android/app/google-services.json`
- Re-run `npx cap sync android` after any web build or config change
- Generate the APK from the synced Android project; no UI or business logic changes are required