# DriveLegal AI — Capacitor & Android Auth Compatibility Report

## Scope

This report is a factual audit of the current frontend and Android Capacitor setup. No code was changed and no packages were installed.

## Installed Capacitor versions

### From `frontend/package.json`

- `@capacitor/core`: `^8.3.4`
- `@capacitor/android`: `^8.3.4`
- `@capacitor/cli`: `^8.3.4`

### From `npm list` in `frontend`

- `@capacitor/core@8.3.4`
- `@capacitor/android@8.3.4`
- `@capacitor/cli@8.3.4`

## Installed native auth / Google Sign-In plugins

The following packages are **not installed** in `frontend`:

- `@capacitor-firebase/authentication`
- `@capawesome/capacitor-firebase-authentication`
- `capacitor-firebase-auth`

No Google Sign-In plugin was found in the repository’s frontend dependencies.

## Relevant Android Firebase configuration

### Present

- `frontend/android/app/google-services.json`
- `frontend/android/build.gradle` applies:
  - `com.google.gms:google-services:4.4.4`
- `frontend/android/app/build.gradle` applies the Google Services plugin when `google-services.json` exists
- Generated Android resources include `default_web_client_id`

### Observed values in `google-services.json`

- Firebase project id: `drive-legal-ai-bf028`
- Android package name: `com.drivelegal.ai`
- OAuth client id present:
  - `811029622672-pmqt67cu012iafkenglkn4c8p8vs7266.apps.googleusercontent.com`

## Current Google auth flow

```mermaid
flowchart TD
  A[Login button in src/pages/Login.jsx] --> B[authService.googleLogin()]
  B --> C[setPersistence(auth, local/session)]
  C --> D[signInWithPopup(auth, provider)]
  D --> E[Firebase hosted auth handler on firebaseapp.com]
  E --> F[Google account sign-in completes]
  F --> G[Firestore user bootstrap in users/{uid}]
  G --> H[AuthContext onAuthStateChanged()]
  H --> I[POST /api/auth/session]
```

## Why Android reaches `firebaseapp.com`

The current implementation uses Firebase Web Auth with:

- `authDomain: "drive-legal-ai-bf028.firebaseapp.com"` in `frontend/src/firebase/config.js`
- `signInWithPopup(auth, provider)` in `frontend/src/services/authService.js`

That means Google sign-in is executed through the Firebase web OAuth handler path, which uses Firebase-hosted auth pages on `*.firebaseapp.com`.

## Capacitor platform detection

No app-source usage was found for:

- `Capacitor.isNativePlatform()`
- `Capacitor.getPlatform()`

No runtime branch exists in the checked frontend source to switch Google sign-in behavior between web and Android.

## SHA and signing references

No SHA-1 or SHA-256 references were found in the checked `frontend/android` source tree.

## “Missing initial state” root cause

The repository does **not** contain the error string itself, so the exact Firebase SDK stack location cannot be confirmed from source alone.

What is confirmed:

- the app uses the Firebase **web** popup auth path
- the same path is used inside the Android Capacitor WebView
- no native Android Firebase Auth bridge is installed
- Firebase’s web OAuth handler is invoked through `firebaseapp.com`

Based on those facts, the failing condition is the WebView executing the browser-oriented Firebase popup/OAuth flow without a native Android auth implementation.

## Compatibility table

| Package | Installed Version | Compatible Native Auth Plugin |
| --- | --- | --- |
| `@capacitor/core` | `8.3.4` | No native auth plugin installed; any replacement must support Capacitor 8.x |
| `@capacitor/android` | `8.3.4` | No native auth plugin installed; any replacement must support Capacitor 8.x |
| `@capacitor/cli` | `8.3.4` | No native auth plugin installed; any replacement must support Capacitor 8.x |

## Can native Google Sign-In be implemented immediately?

### Factual answer

Yes, **the Capacitor version is already present** at `8.3.4`, and Android Firebase configuration is already present (`google-services.json`, Google Services Gradle plugin, OAuth client id).

### What is still missing

- no native Firebase Authentication / Google Sign-In plugin is installed
- no platform branch exists in the frontend source
- no `signInWithCredential()`-based Android path exists in the frontend source

## Exact files tied to the current flow

### Current Google login path

- `frontend/src/pages/Login.jsx`
- `frontend/src/services/authService.js`
- `frontend/src/firebase/config.js`
- `frontend/src/contexts/AuthContext.jsx`

### Android/Firebase support files already present

- `frontend/android/app/google-services.json`
- `frontend/android/app/build.gradle`
- `frontend/android/build.gradle`

## Modification targets for the next implementation phase

The next code change would most likely touch:

- `frontend/src/services/authService.js`
- `frontend/src/pages/Login.jsx`
- optionally `frontend/src/firebase/config.js` if platform branching is centralized there

## Conclusion

Current state:

- Capacitor 8.3.4 is installed
- Google Sign-In uses `signInWithPopup()`
- the app has Firebase Android config in place
- no native auth plugin is installed yet
- no Capacitor platform detection is implemented in the checked frontend source

So the project is **not yet using native Android Google Sign-In**. It is still using the web OAuth flow inside the Android WebView.