const { admin, db } = require('../services/firebaseAdmin')
const { signSessionToken } = require('../services/jwtService')

function normalizeRole(role) {
  const normalized = String(role || 'user').toLowerCase()
  return normalized === 'admin' ? 'admin' : 'user'
}

async function verifyFirebaseIdentity(firebaseToken, fallbackUser = null) {
  if (firebaseToken && typeof admin.auth === 'function') {
    try {
      const decoded = await admin.auth().verifyIdToken(firebaseToken)
      return {
        userId: decoded.uid,
        email: decoded.email || fallbackUser?.email || null,
        name: decoded.name || fallbackUser?.name || null,
        role: normalizeRole(fallbackUser?.role),
      }
    } catch (error) {
      // fall through to the offline fallback below
      console.warn('Firebase ID token verification failed, falling back to request payload.', error.message)
    }
  }

  if (fallbackUser?.userId) {
    return {
      userId: fallbackUser.userId,
      email: fallbackUser.email || null,
      name: fallbackUser.name || null,
      role: normalizeRole(fallbackUser.role),
    }
  }

  throw new Error('Unable to establish authenticated session.')
}

async function syncSession(req, res) {
  try {
    const { firebaseToken, user: fallbackUser } = req.body || {}
    const identity = await verifyFirebaseIdentity(firebaseToken, fallbackUser)

    const userRef = db.collection('users').doc(identity.userId)
    const snapshot = await userRef.get()
    const existing = snapshot.exists ? snapshot.data() : null

    const resolvedUser = {
      userId: identity.userId,
      email: identity.email || existing?.email || null,
      name: identity.name || existing?.name || null,
      role: normalizeRole(existing?.role || identity.role),
    }

    await userRef.set(
      {
        userId: resolvedUser.userId,
        email: resolvedUser.email,
        name: resolvedUser.name,
        role: resolvedUser.role,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    const session = signSessionToken({
      userId: resolvedUser.userId,
      email: resolvedUser.email,
      role: resolvedUser.role,
    })

    return res.json({
      success: true,
      tokenType: 'Bearer',
      expiresIn: 30 * 60,
      token: session.token,
      expiresAt: new Date(session.payload.exp * 1000).toISOString(),
      user: {
        ...resolvedUser,
        uid: resolvedUser.userId,
      },
    })
  } catch (error) {
    console.error('Session sync error:', error)
    return res.status(401).json({
      error: {
        code: 'SESSION_SYNC_FAILED',
        message: error.message || 'Unable to create authenticated session.',
      },
    })
  }
}

module.exports = {
  syncSession,
}