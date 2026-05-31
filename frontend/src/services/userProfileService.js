import { doc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

/**
 * Firestore document path: users/{userId}
 *
 * Schema:
 * {
 *   userId:               string,
 *   vehicleType:          'bike' | 'car' | 'commercial',
 *   onboardingCompleted:  boolean,
 *   complianceProfile:    { [key: string]: boolean },
 *   createdAt:            Timestamp,
 *   updatedAt:            Timestamp
 * }
 */

/**
 * Save the full onboarding result to Firestore.
 * Uses merge:true so pre-existing auth fields (role, email, name) are not overwritten.
 */
export async function saveOnboardingProfile(userId, { vehicleType, complianceProfile }) {
  if (!auth.currentUser) throw new Error('saveOnboardingProfile: auth.currentUser is null')
  if (!vehicleType) throw new Error('saveOnboardingProfile: vehicleType is required')

  const ref = doc(db, 'users', auth.currentUser.uid)
  const snap = await getDoc(ref)
  const isNew = !snap.exists()
  const now = serverTimestamp()

  const data = {
    vehicleType,
    onboardingCompleted: true,
    complianceProfile,
    updatedAt: now,
  }

  if (isNew) {
    data.createdAt = now
  }

  await setDoc(
    doc(db, "users", auth.currentUser.uid),
    data,
    { merge: true }
  )
}

/**
 * Update individual compliance answers (e.g., after user edits profile).
 */
export async function updateComplianceProfile(userId, complianceProfile) {
  if (!userId) throw new Error('updateComplianceProfile: userId is required')

  const ref = doc(db, 'users', userId)
  await updateDoc(ref, {
    complianceProfile,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Lightweight check: does the user's Firestore document exist AND have onboardingCompleted = true?
 * Used for redirect guard logic.
 */
export async function checkOnboardingStatus(userId) {
  if (!auth.currentUser || !userId) {
    console.warn('[userProfileService] checkOnboardingStatus rejected: auth.currentUser is null or user.uid is undefined.')
    return { exists: false, completed: false }
  }
  try {
    const snap = await getDoc(doc(db, 'users', userId))
    if (!snap.exists()) return { exists: false, completed: false }
    const data = snap.data()
    return {
      exists: true,
      completed: data.onboardingCompleted === true,
      profile: data,
    }
  } catch (err) {
    console.error('[userProfileService] checkOnboardingStatus error:', err)
    return { exists: false, completed: false, error: err }
  }
}

/**
 * Update user settings block (e.g. voice alerts toggle, language preferences)
 */
export async function updateUserSettings(userId, settings) {
  if (!userId) throw new Error('updateUserSettings: userId is required')
  const ref = doc(db, 'users', userId)
  await updateDoc(ref, {
    settings,
    updatedAt: serverTimestamp()
  })
}
