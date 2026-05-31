const { verifySessionToken } = require('../services/jwtService')

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

function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req)
    if (!token) {
      return buildAuthError(res, 401, 'NO_TOKEN', 'Authentication token is required.')
    }

    const payload = verifySessionToken(token)
    req.user = payload
    return next()
  } catch (error) {
    if (error.code === 'TOKEN_EXPIRED') {
      return buildAuthError(res, 401, 'TOKEN_EXPIRED', 'Your session has expired. Please sign in again.')
    }

    return buildAuthError(res, 401, 'INVALID_TOKEN', 'Invalid authentication token.')
  }
}

module.exports = {
  requireAuth,
  getBearerToken,
}