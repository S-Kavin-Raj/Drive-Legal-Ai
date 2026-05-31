import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import toast from 'react-hot-toast'

const provider = new GoogleAuthProvider()

function mapFirebaseError(code) {
  const map = {
    'auth/email-already-in-use': 'Email already in use.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password is too weak (min 6 characters).',
    'auth/user-not-found': 'User not found.',
    'auth/wrong-password': 'Incorrect password.',
  }
  return Object.prototype.hasOwnProperty.call(map, code) ? map[code] : 'Authentication failed. Please try again.'
}

export async function signUp({ name, email, password }) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    if (name) {
      await updateProfile(user, { displayName: name })
    }

    const userDoc = {
      userId: user.uid,
      name: name || user.displayName || '',
      email: user.email || email,
      role: 'user',
      createdAt: serverTimestamp(),
    }

    await setDoc(doc(db, 'users', user.uid), userDoc)
    toast.success('Account created')
    return user
  } catch (err) {
    const msg = mapFirebaseError(err.code)
    toast.error(msg)
    throw err
  }
}

export async function login({ email, password, remember = true }) {
  try {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    toast.success('Welcome back')
    return userCredential.user
  } catch (err) {
    const msg = mapFirebaseError(err.code)
    toast.error(msg)
    throw err
  }
}

export async function logout() {
  try {
    await signOut(auth)
    toast.success('Signed out')
  } catch (err) {
    toast.error('Sign out failed')
    throw err
  }
}

export async function googleLogin({ remember = true } = {}) {
  try {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
    const result = await signInWithPopup(auth, provider)
    const user = result.user

    const userDoc = {
      userId: user.uid,
      name: user.displayName || '',
      email: user.email || '',
      role: 'user',
      createdAt: serverTimestamp(),
    }

    await setDoc(doc(db, 'users', user.uid), userDoc, { merge: true })
    toast.success('Signed in with Google')
    return user
  } catch (err) {
    toast.error('Google sign-in failed')
    throw err
  }
}

export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email)
    toast.success('Password reset email sent')
  } catch (err) {
    toast.error('Failed to send reset email')
    throw err
  }
}

export async function fetchUserRole(uid) {
  if (!uid) return null
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) return null
    return snap.data()
  } catch (err) {
    console.error('fetchUserRole error', err)
    throw err
  }
}
