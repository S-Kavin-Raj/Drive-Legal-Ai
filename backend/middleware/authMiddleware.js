const { verifySessionToken } = require('../services/jwtService')
const { admin } = require('../services/firebaseAdmin')

function getBearerToken(req) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) return null
  return token
}

function buildAuthError(res, statusCode, code, message) {
  return res.status(statusCode).json({
    error: {
      code,
      message,
    },
  })
}

async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req)
    if (!token) {
      return buildAuthError(res, 401, 'NO_TOKEN', 'Authentication token is required.')
    }

    try {
      const payload = verifySessionToken(token)
      req.user = payload
      return next()
    } catch (jwtError) {
      if (admin && typeof admin.auth === 'function') {
        try {
          const decoded = await admin.auth().verifyIdToken(token)
          req.user = {
            userId: decoded.uid,
            email: decoded.email || null,
            role: 'user'
          }
          console.log('[authMiddleware] Validated request via fallback Firebase ID token')
          return next()
        } catch (firebaseError) {
          console.warn('[authMiddleware] Fallback Firebase ID token verification failed:', firebaseError.message)
        }
      }

      if (jwtError.code === 'TOKEN_EXPIRED') {
        return buildAuthError(res, 401, 'TOKEN_EXPIRED', 'Your session has expired. Please sign in again.')
      }
      throw jwtError
    }
  } catch (error) {
    return buildAuthError(res, 401, 'INVALID_TOKEN', 'Invalid authentication token.')
  }
}

module.exports = {
  requireAuth,
  getBearerToken,
}