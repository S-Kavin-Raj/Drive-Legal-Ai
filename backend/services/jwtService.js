const crypto = require('crypto')

const DEFAULT_TTL_SECONDS = 30 * 60

function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.FIREBASE_PROJECT_ID || 'drivelegal-dev-secret'
}

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function base64UrlEncodeRaw(value) {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
}

function signSessionToken(payload, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + ttlSeconds

  const header = { alg: 'HS256', typ: 'JWT' }
  const claims = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role || 'user',
    iat: issuedAt,
    exp: expiresAt,
  }

  const unsignedToken = `${base64UrlEncode(header)}.${base64UrlEncode(claims)}`
  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(unsignedToken)
    .digest('base64url')

  return {
    token: `${unsignedToken}.${signature}`,
    payload: claims,
  }
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token is required')
  }

  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid token format')
  }

  const [headerPart, payloadPart, signaturePart] = parts
  const unsignedToken = `${headerPart}.${payloadPart}`
  const expectedSignature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(unsignedToken)
    .digest('base64url')

  const provided = Buffer.from(signaturePart)
  const expected = Buffer.from(expectedSignature)
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    throw new Error('Invalid token signature')
  }

  const payload = base64UrlDecode(payloadPart)
  const now = Math.floor(Date.now() / 1000)

  if (typeof payload.exp !== 'number' || payload.exp <= now) {
    const error = new Error('Token expired')
    error.code = 'TOKEN_EXPIRED'
    throw error
  }

  return payload
}

module.exports = {
  signSessionToken,
  verifySessionToken,
  DEFAULT_TTL_SECONDS,
}