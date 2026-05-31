# First APK Build Steps

## 1. Open Android Studio
Open the existing Capacitor Android project at `frontend/android`.

## 2. Gradle Sync
Let Android Studio finish syncing Gradle and indexing the project.

If you need to refresh from the web app build first:
- Run `npx cap sync android`

## 3. Build Debug APK
In Android Studio:
- Open the Build menu
- Choose Build Bundle(s) / APK(s)
- Select Build APK(s)

## 4. APK Output Location
Typical debug APK output path:
- `frontend/android/app/build/outputs/apk/debug/app-debug.apk`

## 5. Install APK on Device
Install the debug APK onto a connected Android device using one of these methods:
- Android Studio Run button
- `adb install` from a terminal
- file transfer to the device and manual install

## 6. First Device Test Checklist
Verify these on the first device run:
- App opens without crash
- Login works
- Signup works
- Firebase Auth persists after app restart
- Firestore loads user profile and onboarding state
- Firestore writes succeed
- Firebase Storage uploads succeed
- Location permission prompts appear
- Driving mode can acquire GPS updates
- Voice alerts play in the WebView shell
- Gemini assistant requests still reach the backend
- App resumes correctly from background
