// Firebase config and initialization
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: "AIzaSyByApvuAEAgwK3qdZ7veYgJrKvaoaEE13k",
  authDomain: "drive-legal-ai-bf028.firebaseapp.com",
  projectId: "drive-legal-ai-bf028",
  storageBucket: "drive-legal-ai-bf028.firebasestorage.app",
  messagingSenderId: "811029622672",
  appId: "1:811029622672:web:d61fe84263f5a42b3e8d15",
  measurementId: "G-162N1SS6EF"
}

import { getStorage } from 'firebase/storage'

const app = initializeApp(firebaseConfig)

// Analytics, Auth and Firestore instances
export const analytics = getAnalytics(app)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app

